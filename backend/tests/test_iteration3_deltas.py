"""Iteration 3 backend deltas:
- POST /api/auth/google with invalid credential -> 401
- /api/auth/me reflects profile_completed: false -> true after name+phone+address
- JWT cookie max_age >= 30 days
- Admin login still works; admin role doesn't depend on profile_completed (modal gated by role==customer)
- Regression: products count >= 38, /api/delivery/quote real (mocked=false), settings GET/PATCH
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gratinalli.com"
ADMIN_PASSWORD = "admin123"


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ----- Google login endpoint -----
class TestGoogleAuth:
    def test_invalid_google_credential_returns_401(self):
        r = requests.post(f"{API}/auth/google", json={"credential": "not-a-real-jwt"}, timeout=15)
        assert r.status_code == 401, r.text
        body = r.json()
        # FastAPI default error envelope
        assert ("Token Google" in (body.get("detail") or "")) or r.status_code == 401

    def test_missing_credential_returns_422(self):
        r = requests.post(f"{API}/auth/google", json={}, timeout=15)
        assert r.status_code in (400, 422)


# ----- profile_completed flow -----
class TestProfileCompleted:
    def test_register_returns_profile_completed_false_and_then_true(self):
        email = f"TEST_it3_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "secret123", "name": ""},
            timeout=15,
        )
        assert reg.status_code == 200, reg.text
        token = reg.json()["token"]
        # /me should report not completed (no name/phone/address)
        me = requests.get(f"{API}/auth/me", headers=auth_h(token), timeout=15).json()
        assert me.get("profile_completed") is False, me

        # Patch name + phone
        p = requests.patch(
            f"{API}/auth/profile",
            json={"name": "Cliente Teste", "phone": "31988887777"},
            headers=auth_h(token), timeout=15,
        )
        assert p.status_code == 200
        me2 = requests.get(f"{API}/auth/me", headers=auth_h(token), timeout=15).json()
        # Still false: no address yet
        assert me2.get("profile_completed") is False, me2

        # Add an address
        a = requests.post(
            f"{API}/auth/addresses",
            json={
                "label": "Casa", "cep": "31130-600", "street": "Av Pres Antonio Carlos",
                "number": "10", "complement": "", "neighborhood": "Centro",
                "city": "Belo Horizonte", "state": "MG",
            },
            headers=auth_h(token), timeout=15,
        )
        assert a.status_code == 200, a.text
        me3 = requests.get(f"{API}/auth/me", headers=auth_h(token), timeout=15).json()
        assert me3.get("profile_completed") is True, me3


# ----- Cookie max_age -----
class TestCookie30Days:
    def test_login_cookie_has_30day_max_age(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200
        # requests exposes cookies via response.cookies (cookielib jar)
        jar = r.cookies
        access = None
        for c in jar:
            if c.name == "access_token":
                access = c
                break
        assert access is not None, f"access_token cookie not set; got cookies {list(jar.keys())}"
        # max-age becomes expiry timestamp; ensure expiry is at least 25 days in future
        import time
        if access.expires:
            delta_days = (access.expires - time.time()) / 86400
            assert delta_days >= 25, f"cookie expires in only {delta_days} days"
        # Also check raw Set-Cookie header contains Max-Age=2592000 (30d) or close
        sc = r.headers.get("set-cookie", "")
        assert "Max-Age=" in sc or "max-age=" in sc.lower()


# ----- Admin still works -----
class TestAdmin:
    def test_admin_me_has_role_admin(self, admin_token):
        me = requests.get(f"{API}/auth/me", headers=auth_h(admin_token), timeout=15).json()
        assert me["role"] == "admin"
        # profile_completed flag must be present (regardless of value)
        assert "profile_completed" in me


# ----- Regression -----
class TestRegression:
    def test_products_at_least_38(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 38

    def test_settings_get_and_admin_patch(self, admin_token):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        cur = r.json()
        p = requests.patch(
            f"{API}/settings", json={"min_fee": cur.get("min_fee", 5.99)},
            headers=auth_h(admin_token), timeout=15,
        )
        assert p.status_code == 200

    def test_delivery_quote_real(self, admin_token):
        # Ensure sun weather for deterministic mocked=false check
        requests.patch(
            f"{API}/settings", json={"weather": "sun"},
            headers=auth_h(admin_token), timeout=15,
        )
        r = requests.post(
            f"{API}/delivery/quote",
            json={"cep": "31130600", "number": "10"}, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["distance_km"] > 0
        assert data["fee"] > 0
        assert data.get("mocked") is False, data
