from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
import httpx
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ----------------------- Setup -----------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gratinalli")

app = FastAPI(title="Gratinalli Speteria API")
api = APIRouter(prefix="/api")

# ----------------------- Helpers -----------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


def public_user(doc: dict) -> dict:
    addresses = doc.get("addresses") or []
    profile_completed = bool(
        (doc.get("name") or "").strip()
        and (doc.get("phone") or "").strip()
        and len(addresses) > 0
    )
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc.get("role", "customer"),
        "phone": doc.get("phone", ""),
        "picture": doc.get("picture", ""),
        "provider": doc.get("provider", "local"),
        "addresses": addresses,
        "profile_completed": profile_completed,
        "created_at": doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao admin")
    return user


# ----------------------- Models -----------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class Address(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = "Casa"
    cep: str
    street: str
    number: str
    complement: str = ""
    neighborhood: str
    city: str
    state: str


class ProductIn(BaseModel):
    name: str
    weight: str = "110g"
    price: float
    category: str  # bovinos|frango|suinos|peixes|queijos|vegetarianos|especiais|doces
    patente: str   # tradicional|gourmet|premium|especial
    image_url: Optional[str] = ""
    active: bool = True
    promo_price: Optional[float] = None
    description: Optional[str] = ""


class ProductPatch(BaseModel):
    name: Optional[str] = None
    weight: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    patente: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    promo_price: Optional[float] = None
    description: Optional[str] = None


class PromotionIn(BaseModel):
    title: str
    subtitle: str = ""
    image_url: str = ""
    product_ids: List[str] = []
    discount_pct: Optional[float] = None
    active: bool = True


class PromotionPatch(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    product_ids: Optional[List[str]] = None
    discount_pct: Optional[float] = None
    active: Optional[bool] = None


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int


class OrderIn(BaseModel):
    items: List[OrderItem]
    address: Address
    payment_method: Literal["pix", "credit_card", "debit_card", "cash"]
    change_for: Optional[float] = None
    notes: str = ""
    delivery_fee: float
    distance_km: float


class OrderStatusPatch(BaseModel):
    status: Literal["received", "preparing", "out_for_delivery", "delivered", "cancelled"]
    cancel_reason: Optional[str] = None


class CepQuoteIn(BaseModel):
    cep: str
    number: Optional[str] = None
    weather: Optional[Literal["sun", "rain"]] = None  # if set, overrides settings


class SettingsPatch(BaseModel):
    store_open: Optional[bool] = None
    weather: Optional[Literal["sun", "rain"]] = None
    open_from: Optional[str] = None  # "17:00"
    open_to: Optional[str] = None    # "23:30"
    min_fee: Optional[float] = None
    min_fee_rain: Optional[float] = None
    fee_per_km: Optional[float] = None
    fee_per_km_rain: Optional[float] = None
    store_address: Optional[str] = None
    store_phone: Optional[str] = None


class AddressPatch(BaseModel):
    label: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class ProfilePatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


# ----------------------- Auth Routes -----------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": "customer",
        "phone": "",
        "addresses": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


class GoogleLoginIn(BaseModel):
    credential: str  # Google Identity Services id_token (JWT)


@api.post("/auth/google")
async def google_login(body: GoogleLoginIn, response: Response):
    """Verify Google ID token and sign in / create the user."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(500, "Google login não configurado")
    try:
        info = google_id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), client_id
        )
    except ValueError as e:
        logger.warning("Google token invalid: %s", e)
        raise HTTPException(401, "Token Google inválido")

    email = (info.get("email") or "").lower().strip()
    if not email or not info.get("email_verified", True):
        raise HTTPException(401, "E-mail Google não verificado")

    name = info.get("name") or info.get("given_name") or ""
    picture = info.get("picture", "")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "password_hash": hash_password(str(uuid.uuid4())),
            "role": "customer",
            "phone": "",
            "addresses": [],
            "picture": picture,
            "provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        # link / refresh picture & provider tag (preserve name if already set)
        patch = {"provider": user.get("provider") or "google"}
        if picture and user.get("picture") != picture:
            patch["picture"] = picture
        if not user.get("name") and name:
            patch["name"] = name
        if patch:
            await db.users.update_one({"id": user["id"]}, {"$set": patch})
            user = {**user, **patch}

    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/google-mock")
async def google_mock(response: Response):
    """Mock Google login - signs in a placeholder Google account until real API is provided."""
    email = "google-mock@gratinalli.com"
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Cliente Google",
            "password_hash": hash_password(str(uuid.uuid4())),
            "role": "customer",
            "phone": "",
            "addresses": [],
            "provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/addresses")
async def add_address(addr: Address, user: dict = Depends(get_current_user)):
    address = addr.model_dump()
    # Mark primary if it's the first one
    existing = user.get("addresses") or []
    if not existing or not any(a.get("primary") for a in existing):
        address["primary"] = True
    else:
        address["primary"] = False
    await db.users.update_one({"id": user["id"]}, {"$push": {"addresses": address}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


@api.patch("/auth/addresses/{aid}")
async def update_address(aid: str, body: AddressPatch, user: dict = Depends(get_current_user)):
    patch = {f"addresses.$.{k}": v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Nada para atualizar")
    res = await db.users.update_one({"id": user["id"], "addresses.id": aid}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Endereço não encontrado")
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


@api.delete("/auth/addresses/{aid}")
async def delete_address(aid: str, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"addresses": {"id": aid}}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


@api.post("/auth/addresses/{aid}/primary")
async def set_primary_address(aid: str, user: dict = Depends(get_current_user)):
    addrs = user.get("addresses") or []
    new_addrs = []
    found = False
    for a in addrs:
        a2 = dict(a)
        a2["primary"] = a.get("id") == aid
        if a2["primary"]:
            found = True
        new_addrs.append(a2)
    if not found:
        raise HTTPException(404, "Endereço não encontrado")
    await db.users.update_one({"id": user["id"]}, {"$set": {"addresses": new_addrs}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


@api.patch("/auth/profile")
async def update_profile(body: ProfilePatch, user: dict = Depends(get_current_user)):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Nada para atualizar")
    await db.users.update_one({"id": user["id"]}, {"$set": patch})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


# ----------------------- Products -----------------------
@api.get("/products")
async def list_products(active_only: bool = False):
    q = {"active": True} if active_only else {}
    docs = await db.products.find(q, {"_id": 0}).to_list(1000)
    return docs


@api.post("/products")
async def create_product(body: ProductIn, _: dict = Depends(require_admin)):
    p = body.model_dump()
    p["id"] = str(uuid.uuid4())
    p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(p)
    p.pop("_id", None)
    return p


@api.patch("/products/{pid}")
async def update_product(pid: str, body: ProductPatch, _: dict = Depends(require_admin)):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Nada para atualizar")
    res = await db.products.update_one({"id": pid}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Produto não encontrado")
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/products/{pid}")
async def delete_product(pid: str, _: dict = Depends(require_admin)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# ----------------------- Promotions -----------------------
@api.get("/promotions")
async def list_promotions():
    docs = await db.promotions.find({}, {"_id": 0}).to_list(500)
    return docs


@api.post("/promotions")
async def create_promotion(body: PromotionIn, _: dict = Depends(require_admin)):
    p = body.model_dump()
    p["id"] = str(uuid.uuid4())
    p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.promotions.insert_one(p)
    p.pop("_id", None)
    return p


@api.patch("/promotions/{pid}")
async def update_promotion(pid: str, body: PromotionPatch, _: dict = Depends(require_admin)):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await db.promotions.update_one({"id": pid}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Promoção não encontrada")
    return await db.promotions.find_one({"id": pid}, {"_id": 0})


@api.delete("/promotions/{pid}")
async def delete_promotion(pid: str, _: dict = Depends(require_admin)):
    await db.promotions.delete_one({"id": pid})
    return {"ok": True}


# ----------------------- Orders -----------------------
@api.post("/orders")
async def create_order(body: OrderIn, user: dict = Depends(get_current_user)):
    subtotal = sum(it.price * it.quantity for it in body.items)
    total = subtotal + body.delivery_fee
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_email": user["email"],
        "user_phone": user.get("phone", ""),
        "items": [it.model_dump() for it in body.items],
        "address": body.address.model_dump(),
        "payment_method": body.payment_method,
        "change_for": body.change_for,
        "notes": body.notes,
        "subtotal": round(subtotal, 2),
        "delivery_fee": round(body.delivery_fee, 2),
        "distance_km": body.distance_km,
        "total": round(total, 2),
        "status": "received",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order


@api.get("/orders/mine")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.get("/orders")
async def all_orders(_: dict = Depends(require_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api.patch("/orders/{oid}/status")
async def update_order_status(oid: str, body: OrderStatusPatch, _: dict = Depends(require_admin)):
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status == "cancelled" and body.cancel_reason:
        update["cancel_reason"] = body.cancel_reason
        update["cancelled_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.orders.update_one(
        {"id": oid},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Pedido não encontrado")
    return await db.orders.find_one({"id": oid}, {"_id": 0})


# ----------------------- Delivery / CEP -----------------------
@api.get("/cep/{cep}")
async def cep_lookup(cep: str):
    digits = "".join(c for c in cep if c.isdigit())
    if len(digits) != 8:
        raise HTTPException(400, "CEP inválido")
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.get(f"https://viacep.com.br/ws/{digits}/json/")
        data = r.json()
        if data.get("erro"):
            raise HTTPException(404, "CEP não encontrado")
        return data


@api.post("/delivery/quote")
async def delivery_quote(body: CepQuoteIn):
    """Real Google Distance Matrix. Uses GOOGLE_API key and current settings (weather, fees)."""
    digits = "".join(c for c in body.cep if c.isdigit())
    if len(digits) != 8:
        raise HTTPException(400, "CEP inválido")
    settings = await get_or_init_settings()
    google_key = os.environ.get("GOOGLE_API")

    # Build destination address from CEP (+ number if provided)
    dest = None
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    google_used = False

    if google_key:
        try:
            async with httpx.AsyncClient(timeout=15) as cli:
                # 1) ViaCEP to enrich destination
                via = await cli.get(f"https://viacep.com.br/ws/{digits}/json/")
                via_data = via.json() if via.status_code == 200 else {}
                if via_data and not via_data.get("erro"):
                    parts = []
                    if via_data.get("logradouro"):
                        parts.append(via_data["logradouro"])
                    if body.number:
                        parts.append(body.number)
                    if via_data.get("bairro"):
                        parts.append(via_data["bairro"])
                    if via_data.get("localidade"):
                        parts.append(via_data["localidade"])
                    if via_data.get("uf"):
                        parts.append(via_data["uf"])
                    parts.append(digits)
                    parts.append("Brasil")
                    dest = ", ".join(parts)
                else:
                    dest = f"{digits}, Brasil"

                origin = settings.get("store_address") or os.environ.get("STORE_CEP", "01310-100")

                # 2) Google Distance Matrix
                r = await cli.get(
                    "https://maps.googleapis.com/maps/api/distancematrix/json",
                    params={
                        "origins": origin,
                        "destinations": dest,
                        "mode": "driving",
                        "key": google_key,
                        "language": "pt-BR",
                        "region": "br",
                    },
                )
                data = r.json()
                if data.get("status") == "OK":
                    el = data["rows"][0]["elements"][0]
                    if el.get("status") == "OK":
                        distance_km = round(el["distance"]["value"] / 1000.0, 2)
                        duration_min = round(el["duration"]["value"] / 60.0, 1)
                        google_used = True
                    else:
                        logger.warning("Distance Matrix element status: %s", el.get("status"))
                else:
                    logger.warning("Distance Matrix top status: %s %s", data.get("status"), data.get("error_message", ""))
        except Exception as e:
            logger.exception("Distance Matrix error: %s", e)

    # Fallback deterministic distance if Google didn't return
    if distance_km is None:
        seed = sum(int(d) for d in digits)
        distance_km = round(1.5 + (seed % 11) + (int(digits[-2:]) % 50) / 100, 2)

    weather = body.weather or settings.get("weather", "sun")
    if weather == "rain":
        min_fee = float(settings.get("min_fee_rain", 8.99))
        per_km = float(settings.get("fee_per_km_rain", 2.50))
    else:
        min_fee = float(settings.get("min_fee", 5.99))
        per_km = float(settings.get("fee_per_km", 1.80))

    fee = max(min_fee, round(min_fee + per_km * max(0.0, distance_km - 1.0), 2))
    fee = round(fee, 2)
    return {
        "distance_km": distance_km,
        "duration_min": duration_min,
        "fee": fee,
        "weather": weather,
        "mocked": not google_used,
        "destination": dest,
    }


# ----------------------- Settings -----------------------
DEFAULT_SETTINGS = {
    "store_open": True,
    "weather": "sun",
    "open_from": "17:00",
    "open_to": "23:30",
    "min_fee": 5.99,
    "min_fee_rain": 8.99,
    "fee_per_km": 1.80,
    "fee_per_km_rain": 2.50,
    "store_address": os.environ.get("STORE_CEP", "01310-100") + ", Brasil",
    "store_phone": "5511900000000",
}


async def get_or_init_settings() -> dict:
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        doc = {"_id": "global", **DEFAULT_SETTINGS, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.settings.insert_one(doc)
    out = {k: v for k, v in doc.items() if k != "_id"}
    return out


@api.get("/settings")
async def get_settings():
    return await get_or_init_settings()


@api.patch("/settings")
async def patch_settings(body: SettingsPatch, _: dict = Depends(require_admin)):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Nada para atualizar")
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one({"_id": "global"}, {"$set": patch}, upsert=True)
    return await get_or_init_settings()


# ----------------------- Startup: seed admin + products -----------------------
SEED_PRODUCTS = [
    # name, price, category, patente, weight
    ("Frango", 24.90, "frango", "tradicional"),
    ("Salsichão Comum", 24.90, "suinos", "tradicional"),
    ("Porco", 25.90, "suinos", "tradicional"),
    ("Pururuca", 25.90, "suinos", "tradicional"),
    ("Coração", 25.90, "frango", "tradicional"),
    ("Linguiça Aperitivo", 25.90, "suinos", "tradicional"),
    ("Medalhão de Linguiça", 25.90, "suinos", "tradicional"),
    ("Medalhão de Coração", 26.90, "frango", "gourmet"),
    ("Medalhão de Frango", 26.90, "frango", "gourmet"),
    ("Medalhão de Porco", 26.90, "suinos", "gourmet"),
    ("Medalhão de Frango com Cheddar", 26.90, "frango", "gourmet"),
    ("Medalhão de Frango com Provolone", 26.90, "frango", "gourmet"),
    ("Costelinha", 26.90, "suinos", "gourmet"),
    ("Medalhão de Cebola", 27.90, "vegetarianos", "gourmet"),
    ("Medalhão Batata com Cheddar", 27.90, "vegetarianos", "gourmet"),
    ("Kafta", 27.90, "bovinos", "gourmet"),
    ("Boi com Bacon", 27.90, "bovinos", "gourmet"),
    ("Mista (Boi, Porco e Bacon)", 27.90, "bovinos", "gourmet"),
    ("Tulipa", 27.90, "frango", "gourmet"),
    ("Brochete de Boi", 27.90, "bovinos", "gourmet"),
    ("Medalhão de Palmito", 27.90, "vegetarianos", "gourmet"),
    ("Boi", 28.90, "bovinos", "gourmet"),
    ("Almôndega com Queijo", 28.90, "bovinos", "gourmet"),
    ("Almôndega com Cheddar", 28.90, "bovinos", "gourmet"),
    ("Kafta Recheada", 28.90, "bovinos", "gourmet"),
    ("Kafta com Bacon e Cheddar", 28.90, "bovinos", "gourmet"),
    ("Medalhão de Boi", 28.90, "bovinos", "gourmet"),
    ("Tilápia", 29.90, "peixes", "premium"),
    ("Aipim", 29.90, "vegetarianos", "premium"),
    ("Abacaxi com Provolone", 29.90, "especiais", "premium"),
    ("Contra Filé", 29.90, "bovinos", "premium"),
    ("Medalhão de Aipim", 29.90, "vegetarianos", "premium"),
    ("Mussarela", 29.90, "queijos", "premium"),
    ("Romeu e Julieta", 29.90, "especiais", "premium"),
    ("Medalhão de Queijo", 30.90, "queijos", "premium"),
    ("Camarão", 31.90, "peixes", "premium"),
    ("Salmão", 34.90, "peixes", "especial"),
    ("Picanha", 35.00, "bovinos", "especial"),
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Administrador",
            "password_hash": hash_password(password),
            "role": "admin",
            "phone": "",
            "addresses": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded: %s", email)
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password), "role": "admin"}},
        )
        logger.info("Admin password refreshed")


async def seed_products():
    if await db.products.count_documents({}) > 0:
        return
    docs = []
    for name, price, category, patente in SEED_PRODUCTS:
        docs.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "weight": "110g",
            "price": price,
            "category": category,
            "patente": patente,
            "image_url": "",
            "active": True,
            "promo_price": None,
            "description": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.products.insert_many(docs)
    logger.info("Seeded %d products", len(docs))


async def seed_promotions():
    if await db.promotions.count_documents({}) > 0:
        return
    sample = [
        {
            "id": str(uuid.uuid4()),
            "title": "Combo Família",
            "subtitle": "10 espetos tradicionais com 15% OFF",
            "image_url": "",
            "product_ids": [],
            "discount_pct": 15,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Sextou Premium",
            "subtitle": "Picanha + Salmão com frete grátis",
            "image_url": "",
            "product_ids": [],
            "discount_pct": 10,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Doce & Salgado",
            "subtitle": "Compre 5 e ganhe 1 Romeu e Julieta",
            "image_url": "",
            "product_ids": [],
            "discount_pct": 0,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await db.promotions.insert_many(sample)
    logger.info("Seeded %d promotions", len(sample))


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.promotions.create_index("id", unique=True)
    await seed_admin()
    await seed_products()
    await seed_promotions()
    await migrate_product_images()
    await get_or_init_settings()


PRODUCT_IMAGE_SLUGS = {
    "Frango": "frango",
    "Salsichão Comum": "salsichao-comum",
    "Porco": "porco",
    "Pururuca": "pururuca",
    "Coração": "coracao",
    "Linguiça Aperitivo": "linguica-aperitivo",
    "Medalhão de Linguiça": "medalhao-linguica",
    "Medalhão de Coração": "medalhao-coracao",
    "Medalhão de Frango": "medalhao-frango",
    "Medalhão de Porco": "medalhao-porco",
    "Medalhão de Frango com Cheddar": "medalhao-frango-cheddar",
    "Medalhão de Frango com Provolone": "medalhao-frango-provolone",
    "Costelinha": "costelinha",
    "Medalhão de Cebola": "medalhao-cebola",
    "Medalhão Batata com Cheddar": "medalhao-batata-cheddar",
    "Kafta": "kafta",
    "Boi com Bacon": "boi-bacon",
    "Mista (Boi, Porco e Bacon)": "mista",
    "Tulipa": "tulipa",
    "Brochete de Boi": "brochete-boi",
    "Medalhão de Palmito": "medalhao-palmito",
    "Boi": "boi",
    "Almôndega com Queijo": "almondega-queijo",
    "Almôndega com Cheddar": "almondega-cheddar",
    "Kafta Recheada": "kafta-recheada",
    "Kafta com Bacon e Cheddar": "kafta-bacon-cheddar",
    "Medalhão de Boi": "medalhao-boi",
    "Tilápia": "tilapia",
    "Aipim": "aipim",
    "Abacaxi com Provolone": "abacaxi-provolone",
    "Contra Filé": "contra-file",
    "Medalhão de Aipim": "medalhao-aipim",
    "Mussarela": "mussarela",
    "Romeu e Julieta": "romeu-julieta",
    "Medalhão de Queijo": "medalhao-queijo",
    "Camarão": "camarao",
    "Salmão": "salmao",
    "Picanha": "picanha",
}


async def migrate_product_images() -> None:
    """Set image_url for products whose image_url is empty/None, based on name -> slug mapping."""
    updated = 0
    async for p in db.products.find({}, {"_id": 0, "id": 1, "name": 1, "image_url": 1}):
        if p.get("image_url"):
            continue
        slug = PRODUCT_IMAGE_SLUGS.get(p.get("name", ""))
        if not slug:
            continue
        await db.products.update_one({"id": p["id"]}, {"$set": {"image_url": f"/produtos/{slug}.jpg"}})
        updated += 1
    if updated:
        logger.info("Migrated %d product images", updated)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"name": "Gratinalli Speteria API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
