"""Backend test suite for Gratinalli Speteria API.

Covers: health, auth (register/login/google-mock/me/logout/invalid),
products (list seed, admin CRUD, unauthorized),
promotions (list seed, admin CRUD),
CEP (ViaCEP proxy + invalid),
delivery quote (mocked),
orders (customer create, mine, admin list, status transitions).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gratinalli-spets.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gratinalli.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer():
    """Create a fresh customer for the session and return (token, email, user_id)."""
    s = requests.Session()
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret123", "name": "Test Customer"},
        timeout=15,
    )
    assert r.status_code == 200, f"register failed {r.status_code} {r.text}"
    body = r.json()
    return {"token": body["token"], "email": email, "id": body["user"]["id"]}


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert j.get("status") == "ok"
        assert "Gratinalli" in j.get("name", "")


# ---------- Auth ----------
class TestAuth:
    def test_register_and_me(self, customer):
        r = requests.get(f"{API}/auth/me", headers=auth_h(customer["token"]), timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["email"].lower() == customer["email"].lower()
        assert body["role"] == "customer"

    def test_login_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=auth_h(admin_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_google_mock(self):
        r = requests.post(f"{API}/auth/google-mock", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["email"] == "google-mock@gratinalli.com"
        assert "token" in body

    def test_invalid_login(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "noone@example.com", "password": "wrong"},
            timeout=10,
        )
        assert r.status_code == 401
        assert isinstance(r.json().get("detail"), str)

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout(self, customer):
        s = requests.Session()
        # login fresh to get cookie
        r = s.post(f"{API}/auth/login", json={"email": customer["email"], "password": "secret123"}, timeout=10)
        assert r.status_code == 200
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        # cookie cleared - call /me without Bearer
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# ---------- Products ----------
class TestProducts:
    def test_list_seed(self):
        r = requests.get(f"{API}/products", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 38, f"Expected 38 products, got {len(items)}"
        for p in items:
            assert {"id", "name", "weight", "price", "category", "patente", "active"} <= set(p.keys())
            assert p["weight"] == "110g"
            assert p["active"] is True

    def test_admin_crud(self, admin_token):
        # CREATE
        payload = {
            "name": "TEST_Espeto",
            "price": 19.90,
            "category": "bovinos",
            "patente": "tradicional",
        }
        r = requests.post(f"{API}/products", json=payload, headers=auth_h(admin_token), timeout=10)
        assert r.status_code == 200, r.text
        prod = r.json()
        pid = prod["id"]
        assert prod["weight"] == "110g"
        assert prod["active"] is True

        # PATCH toggle active false + promo
        r = requests.patch(
            f"{API}/products/{pid}",
            json={"active": False, "promo_price": 9.90},
            headers=auth_h(admin_token),
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["active"] is False
        assert r.json()["promo_price"] == 9.90

        # GET verify persisted
        items = requests.get(f"{API}/products", timeout=10).json()
        match = next((x for x in items if x["id"] == pid), None)
        assert match is not None
        assert match["active"] is False
        assert match["promo_price"] == 9.90

        # DELETE
        r = requests.delete(f"{API}/products/{pid}", headers=auth_h(admin_token), timeout=10)
        assert r.status_code == 200

        items = requests.get(f"{API}/products", timeout=10).json()
        assert not any(x["id"] == pid for x in items)

    def test_anon_create_forbidden(self):
        r = requests.post(
            f"{API}/products",
            json={"name": "Z", "price": 1.0, "category": "frango", "patente": "tradicional"},
            timeout=10,
        )
        assert r.status_code == 401

    def test_customer_create_forbidden(self, customer):
        r = requests.post(
            f"{API}/products",
            json={"name": "Z", "price": 1.0, "category": "frango", "patente": "tradicional"},
            headers=auth_h(customer["token"]),
            timeout=10,
        )
        assert r.status_code == 403


# ---------- Promotions ----------
class TestPromotions:
    def test_list_seed(self):
        r = requests.get(f"{API}/promotions", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3

    def test_admin_crud(self, admin_token):
        r = requests.post(
            f"{API}/promotions",
            json={"title": "TEST_Promo20", "discount_pct": 20, "active": True},
            headers=auth_h(admin_token),
            timeout=10,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["discount_pct"] == 20

        r = requests.patch(
            f"{API}/promotions/{pid}",
            json={"active": False},
            headers=auth_h(admin_token),
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["active"] is False

        r = requests.delete(f"{API}/promotions/{pid}", headers=auth_h(admin_token), timeout=10)
        assert r.status_code == 200

    def test_anon_create_forbidden(self):
        r = requests.post(f"{API}/promotions", json={"title": "X"}, timeout=10)
        assert r.status_code == 401


# ---------- CEP ----------
class TestCep:
    def test_valid(self):
        r = requests.get(f"{API}/cep/01310100", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "logradouro" in data
        assert data["logradouro"].strip() != ""

    def test_invalid_format(self):
        r = requests.get(f"{API}/cep/123", timeout=10)
        assert r.status_code == 400

    def test_not_found(self):
        r = requests.get(f"{API}/cep/00000000", timeout=15)
        assert r.status_code == 404


# ---------- Delivery quote ----------
class TestDelivery:
    def test_quote(self):
        r = requests.post(f"{API}/delivery/quote", json={"cep": "01310100"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["distance_km"], (int, float))
        assert isinstance(body["fee"], (int, float))
        assert body.get("mocked") is True

    def test_invalid_cep(self):
        r = requests.post(f"{API}/delivery/quote", json={"cep": "abc"}, timeout=10)
        assert r.status_code == 400


# ---------- Orders ----------
class TestOrders:
    def _build_order(self):
        products = requests.get(f"{API}/products", timeout=10).json()
        items = [
            {"product_id": products[0]["id"], "name": products[0]["name"], "price": products[0]["price"], "quantity": 2},
            {"product_id": products[1]["id"], "name": products[1]["name"], "price": products[1]["price"], "quantity": 1},
        ]
        return {
            "items": items,
            "address": {
                "label": "Casa",
                "cep": "01310100",
                "street": "Av Paulista",
                "number": "10",
                "complement": "",
                "neighborhood": "Bela Vista",
                "city": "São Paulo",
                "state": "SP",
            },
            "payment_method": "pix",
            "notes": "TEST order",
            "delivery_fee": 7.99,
            "distance_km": 4.2,
        }

    def test_customer_flow_and_admin_transitions(self, customer, admin_token):
        # Customer create order
        payload = self._build_order()
        r = requests.post(f"{API}/orders", json=payload, headers=auth_h(customer["token"]), timeout=15)
        assert r.status_code == 200, r.text
        order = r.json()
        oid = order["id"]
        assert order["status"] == "received"
        assert order["payment_method"] == "pix"
        # totals
        expected_subtotal = round(sum(it["price"] * it["quantity"] for it in payload["items"]), 2)
        assert order["subtotal"] == expected_subtotal
        assert order["total"] == round(expected_subtotal + 7.99, 2)

        # GET /api/orders/mine
        r = requests.get(f"{API}/orders/mine", headers=auth_h(customer["token"]), timeout=10)
        assert r.status_code == 200
        mine = r.json()
        assert any(o["id"] == oid for o in mine)

        # Admin list contains it
        r = requests.get(f"{API}/orders", headers=auth_h(admin_token), timeout=10)
        assert r.status_code == 200
        assert any(o["id"] == oid for o in r.json())

        # Status transitions
        for s in ["preparing", "out_for_delivery", "delivered"]:
            r = requests.patch(
                f"{API}/orders/{oid}/status",
                json={"status": s},
                headers=auth_h(admin_token),
                timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["status"] == s

        # Cancel another fresh order
        r = requests.post(f"{API}/orders", json=payload, headers=auth_h(customer["token"]), timeout=15)
        oid2 = r.json()["id"]
        r = requests.patch(
            f"{API}/orders/{oid2}/status",
            json={"status": "cancelled"},
            headers=auth_h(admin_token),
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_orders_admin_only(self, customer):
        r = requests.get(f"{API}/orders", headers=auth_h(customer["token"]), timeout=10)
        assert r.status_code == 403

    def test_create_order_unauth(self):
        r = requests.post(f"{API}/orders", json={}, timeout=10)
        assert r.status_code in (401, 422)
