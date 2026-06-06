"""Iteration 2 backend deltas:
- GET/PATCH /api/settings (admin only)
- POST /api/delivery/quote with real Google Distance Matrix + weather toggling fee
- /api/auth/addresses CRUD + primary management
- PATCH /api/auth/profile (name/phone)
- regression: /api/products still 38, admin login still works
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gratinnari.com"
ADMIN_PASSWORD = "admin123"


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def customer():
    email = f"TEST_it2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret123", "name": "It2 Customer"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "email": email, "id": r.json()["user"]["id"]}


# ---------- Regression ----------
class TestRegression:
    def test_admin_login_still_works(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_products_count_still_38(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # All products including any TEST_ leftovers; assert at least 38 seed entries
        names = [p["name"] for p in data]
        assert len(names) >= 38, f"expected >=38 got {len(names)}"


# ---------- Settings ----------
class TestSettings:
    def test_get_settings_defaults(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in [
            "store_open", "weather", "open_from", "open_to",
            "min_fee", "min_fee_rain", "fee_per_km", "fee_per_km_rain",
            "store_address", "store_phone",
        ]:
            assert k in s, f"missing key {k}"
        assert s["weather"] in ("sun", "rain")
        assert isinstance(s["store_open"], bool)

    def test_patch_settings_requires_admin(self, customer):
        r = requests.patch(
            f"{API}/settings", json={"min_fee_rain": 9.99},
            headers=auth_h(customer["token"]), timeout=15,
        )
        assert r.status_code == 403

    def test_patch_settings_anon_unauthorized(self):
        r = requests.patch(f"{API}/settings", json={"min_fee_rain": 9.99}, timeout=15)
        assert r.status_code == 401

    def test_admin_patch_settings_round_trip(self, admin_token):
        # Save original
        cur = requests.get(f"{API}/settings", timeout=15).json()
        try:
            r = requests.patch(
                f"{API}/settings",
                json={"store_open": True, "weather": "rain", "min_fee_rain": 9.49},
                headers=auth_h(admin_token), timeout=15,
            )
            assert r.status_code == 200, r.text
            updated = r.json()
            assert updated["weather"] == "rain"
            assert updated["min_fee_rain"] == 9.49
            assert updated["store_open"] is True

            # Confirm persisted via GET
            g = requests.get(f"{API}/settings", timeout=15).json()
            assert g["weather"] == "rain"
            assert g["min_fee_rain"] == 9.49
        finally:
            # Restore so other tests/UI continue working
            requests.patch(
                f"{API}/settings",
                json={
                    "store_open": True,
                    "weather": cur.get("weather", "sun"),
                    "min_fee_rain": cur.get("min_fee_rain", 8.99),
                },
                headers=auth_h(admin_token), timeout=15,
            )


# ---------- Delivery quote (real Distance Matrix) ----------
class TestDeliveryQuote:
    def test_real_distance_matrix_and_weather_increases_fee(self, admin_token):
        # Force sun + known fees
        sun_set = requests.patch(
            f"{API}/settings",
            json={"weather": "sun", "min_fee": 5.99, "fee_per_km": 1.80,
                  "min_fee_rain": 8.99, "fee_per_km_rain": 2.50},
            headers=auth_h(admin_token), timeout=15,
        )
        assert sun_set.status_code == 200
        sun_q = requests.post(
            f"{API}/delivery/quote",
            json={"cep": "01310100", "number": "100"}, timeout=30,
        )
        assert sun_q.status_code == 200, sun_q.text
        sun = sun_q.json()
        assert sun["distance_km"] > 0
        assert sun["fee"] > 0
        assert sun["weather"] == "sun"
        # If GOOGLE_API is configured -> mocked should be False
        assert sun.get("mocked") is False, f"Distance Matrix not used: {sun}"

        # Now switch to rain
        requests.patch(
            f"{API}/settings", json={"weather": "rain"},
            headers=auth_h(admin_token), timeout=15,
        )
        rain_q = requests.post(
            f"{API}/delivery/quote",
            json={"cep": "01310100", "number": "100"}, timeout=30,
        )
        assert rain_q.status_code == 200
        rain = rain_q.json()
        assert rain["weather"] == "rain"
        assert rain["fee"] > sun["fee"], f"rain fee {rain['fee']} should exceed sun fee {sun['fee']}"

        # restore sun
        requests.patch(
            f"{API}/settings", json={"weather": "sun"},
            headers=auth_h(admin_token), timeout=15,
        )


# ---------- Addresses ----------
class TestAddresses:
    @pytest.fixture(scope="class")
    def fresh_customer(self):
        email = f"TEST_addr_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "secret123", "name": "Addr User"},
            timeout=15,
        )
        assert r.status_code == 200
        return {"token": r.json()["token"], "email": email}

    def _payload(self, label="Casa"):
        return {
            "label": label,
            "cep": "01310-100",
            "street": "Av. Paulista",
            "number": "100",
            "complement": "",
            "neighborhood": "Bela Vista",
            "city": "São Paulo",
            "state": "SP",
        }

    def test_add_first_address_is_primary(self, fresh_customer):
        r = requests.post(
            f"{API}/auth/addresses", json=self._payload("Casa"),
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["addresses"]) == 1
        assert data["addresses"][0]["primary"] is True
        fresh_customer["first_id"] = data["addresses"][0]["id"]

    def test_add_second_address_not_primary(self, fresh_customer):
        r = requests.post(
            f"{API}/auth/addresses", json=self._payload("Trabalho"),
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["addresses"]) == 2
        second = [a for a in data["addresses"] if a["label"] == "Trabalho"][0]
        assert second["primary"] is False
        fresh_customer["second_id"] = second["id"]

    def test_set_second_as_primary(self, fresh_customer):
        sid = fresh_customer["second_id"]
        r = requests.post(
            f"{API}/auth/addresses/{sid}/primary",
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        primaries = [a for a in data["addresses"] if a.get("primary")]
        assert len(primaries) == 1 and primaries[0]["id"] == sid

    def test_patch_address_label(self, fresh_customer):
        fid = fresh_customer["first_id"]
        r = requests.patch(
            f"{API}/auth/addresses/{fid}",
            json={"label": "Casa Nova"},
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        target = [a for a in data["addresses"] if a["id"] == fid][0]
        assert target["label"] == "Casa Nova"

    def test_delete_address(self, fresh_customer):
        fid = fresh_customer["first_id"]
        r = requests.delete(
            f"{API}/auth/addresses/{fid}",
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        ids = [a["id"] for a in data["addresses"]]
        assert fid not in ids

    def test_patch_missing_address_returns_404(self, fresh_customer):
        r = requests.patch(
            f"{API}/auth/addresses/does-not-exist",
            json={"label": "X"},
            headers=auth_h(fresh_customer["token"]), timeout=15,
        )
        assert r.status_code == 404


# ---------- Profile ----------
class TestProfile:
    def test_update_profile_name_and_phone(self, customer):
        r = requests.patch(
            f"{API}/auth/profile",
            json={"name": "Updated Name", "phone": "31999998888"},
            headers=auth_h(customer["token"]), timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Updated Name"
        assert data["phone"] == "31999998888"

        me = requests.get(f"{API}/auth/me", headers=auth_h(customer["token"]), timeout=15).json()
        assert me["name"] == "Updated Name"
        assert me["phone"] == "31999998888"

    def test_profile_empty_patch_rejected(self, customer):
        r = requests.patch(
            f"{API}/auth/profile", json={},
            headers=auth_h(customer["token"]), timeout=15,
        )
        assert r.status_code == 400
