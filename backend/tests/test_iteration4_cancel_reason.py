"""Iteration 4 backend deltas - cancel_reason on order status update.

Scope:
- PATCH /api/orders/{id}/status with status=cancelled + cancel_reason persists fields
- GET /api/orders returns the cancelled order with cancel_reason populated
- Regression: normal status transitions still work (received->preparing->out_for_delivery->delivered)
- cancel_reason ignored when status != 'cancelled' (graceful)
- status='cancelled' without cancel_reason works (cancel_reason just not set)
- Auth endpoints, products, promotions, settings, cep, delivery/quote, orders/mine still work
"""
import os
import uuid
import pytest
import requests

_PUBLIC = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fall back to local if public ingress is 404'ing (Cloudflare cache issue noted by main agent).
# We probe the public URL once; if it's broken we use localhost so the cancel_reason logic
# can still be validated end-to-end against the same backend instance.
def _pick_base():
    if _PUBLIC:
        try:
            r = requests.get(f"{_PUBLIC}/api/products", timeout=10)
            if r.status_code == 200:
                return _PUBLIC
        except Exception:
            pass
    return "http://localhost:8001"


BASE_URL = _pick_base()
API = f"{BASE_URL}/api"
print(f"[test_iteration4] Using BASE_URL={BASE_URL}")

ADMIN_EMAIL = "admin@gratinalli.com"
ADMIN_PASSWORD = "admin123"


def auth_h(token: str):
    return {"Authorization": f"Bearer {token}"}


# ------- Fixtures -------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def customer():
    """Create a customer with name/phone/address so /orders works."""
    email = f"TEST_it4_{uuid.uuid4().hex[:8]}@example.com"
    reg = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret123", "name": "Cliente Teste It4"},
        timeout=15,
    )
    assert reg.status_code == 200, reg.text
    token = reg.json()["token"]
    # Patch phone
    p = requests.patch(
        f"{API}/auth/profile",
        json={"name": "Cliente Teste It4", "phone": "31999998888"},
        headers=auth_h(token),
        timeout=15,
    )
    assert p.status_code == 200, p.text
    # Add address
    addr_payload = {
        "label": "Casa",
        "cep": "31130-600",
        "street": "Av Pres Antonio Carlos",
        "number": "10",
        "complement": "",
        "neighborhood": "Centro",
        "city": "Belo Horizonte",
        "state": "MG",
    }
    a = requests.post(
        f"{API}/auth/addresses", json=addr_payload, headers=auth_h(token), timeout=15
    )
    assert a.status_code == 200, a.text
    return {"token": token, "email": email, "address": addr_payload}


def _build_order_payload(address: dict) -> dict:
    # Fetch one product
    pr = requests.get(f"{API}/products", timeout=15)
    assert pr.status_code == 200
    products = pr.json()
    assert len(products) >= 1
    prod = products[0]
    return {
        "items": [
            {
                "product_id": prod["id"],
                "name": prod["name"],
                "price": float(prod["price"]),
                "quantity": 1,
            }
        ],
        "address": address,
        "payment_method": "pix",
        "change_for": None,
        "notes": "TEST it4 order",
        "delivery_fee": 5.99,
        "distance_km": 1.2,
    }


def _create_order(customer) -> str:
    payload = _build_order_payload(customer["address"])
    r = requests.post(
        f"{API}/orders", json=payload, headers=auth_h(customer["token"]), timeout=20
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "received"
    return data["id"]


# ------- 1) Cancel with reason: persists cancel_reason + cancelled_at -------
class TestCancelWithReason:
    def test_patch_cancelled_persists_reason(self, admin_token, customer):
        oid = _create_order(customer)
        reason = "Pagamento não confirmado"
        r = requests.patch(
            f"{API}/orders/{oid}/status",
            json={"status": "cancelled", "cancel_reason": reason},
            headers=auth_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "cancelled"
        assert body.get("cancel_reason") == reason, body
        assert body.get("cancelled_at"), body

        # GET /api/orders should return cancel_reason populated
        all_orders = requests.get(
            f"{API}/orders", headers=auth_h(admin_token), timeout=15
        ).json()
        match = next((o for o in all_orders if o["id"] == oid), None)
        assert match is not None
        assert match.get("cancel_reason") == reason
        assert match.get("cancelled_at")

        # Customer's GET /orders/mine also shows it
        mine = requests.get(
            f"{API}/orders/mine", headers=auth_h(customer["token"]), timeout=15
        ).json()
        match2 = next((o for o in mine if o["id"] == oid), None)
        assert match2 is not None
        assert match2.get("cancel_reason") == reason


# ------- 2) Cancelled without reason still cancels -------
class TestCancelledWithoutReason:
    def test_patch_cancelled_no_reason(self, admin_token, customer):
        oid = _create_order(customer)
        r = requests.patch(
            f"{API}/orders/{oid}/status",
            json={"status": "cancelled"},
            headers=auth_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "cancelled"
        # cancel_reason should NOT be set (or be None/missing)
        assert not body.get("cancel_reason")


# ------- 3) cancel_reason ignored when status != cancelled -------
class TestCancelReasonIgnoredWhenNonCancel:
    def test_preparing_with_cancel_reason_does_not_crash(self, admin_token, customer):
        oid = _create_order(customer)
        r = requests.patch(
            f"{API}/orders/{oid}/status",
            json={"status": "preparing", "cancel_reason": "should be ignored"},
            headers=auth_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "preparing"
        assert not body.get("cancel_reason"), body
        assert not body.get("cancelled_at"), body


# ------- 4) Regression: full normal lifecycle -------
class TestNormalLifecycle:
    def test_received_to_delivered(self, admin_token, customer):
        oid = _create_order(customer)
        for status in ("preparing", "out_for_delivery", "delivered"):
            r = requests.patch(
                f"{API}/orders/{oid}/status",
                json={"status": status},
                headers=auth_h(admin_token),
                timeout=15,
            )
            assert r.status_code == 200, f"{status}: {r.text}"
            assert r.json()["status"] == status


# ------- 5) Auth/general regression -------
class TestRegression:
    def test_auth_me_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_settings_get(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "min_fee" in data

    def test_cep_lookup(self):
        r = requests.get(f"{API}/cep/31130-600", timeout=20)
        assert r.status_code == 200
        data = r.json()
        # ViaCEP returns 'cep' field
        assert data.get("cep") or data.get("logradouro")

    def test_products_at_least_38(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 38

    def test_promotions_at_least_3(self):
        r = requests.get(f"{API}/promotions", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 3

    def test_delivery_quote(self):
        r = requests.post(
            f"{API}/delivery/quote",
            json={"cep": "31130-600", "number": "10"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["fee"] > 0
        assert data["distance_km"] > 0

    def test_orders_mine_works(self, customer):
        # create a fresh order then list
        _create_order(customer)
        r = requests.get(
            f"{API}/orders/mine", headers=auth_h(customer["token"]), timeout=15
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_post_order_creates(self, customer):
        payload = _build_order_payload(customer["address"])
        r = requests.post(
            f"{API}/orders",
            json=payload,
            headers=auth_h(customer["token"]),
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "received"
        assert body["total"] == round(
            payload["items"][0]["price"] * payload["items"][0]["quantity"]
            + payload["delivery_fee"],
            2,
        )
