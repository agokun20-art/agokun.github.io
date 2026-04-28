"""Backend API tests for Flow — AI Daily Life OS (UPDATED Jan 2026).

Covers: weather, morning brief (POST), priorities CRUD, expenses CRUD,
habits, evening brief, flow dashboard, chat, AI caching, profile reset.
"""
import os
import uuid
import pytest
import requests
from pathlib import Path

# Resolve BASE_URL from frontend .env (public preview URL)
BASE_URL = None
fe_env = Path('/app/frontend/.env').read_text()
for line in fe_env.splitlines():
    if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
        BASE_URL = line.split('=', 1)[1].strip().strip('"')
        break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"

LAT, LON = 40.71, -74.01  # NYC


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def reset_state(client):
    # Reset before suite, run tests, reset after
    client.delete(f"{API}/profile/reset", timeout=20)
    yield
    client.delete(f"{API}/profile/reset", timeout=20)


# ---------- Health ----------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "Flow" in r.json().get("message", "")


# ---------- Weather ----------
class TestWeather:
    def test_weather_live(self, client):
        r = client.get(f"{API}/weather", params={"lat": LAT, "lon": LON}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("temp", "condition", "high", "low", "icon"):
            assert k in d, f"missing {k}"
        assert isinstance(d["temp"], (int, float))
        assert d["unit"] == "F"
        # label may be None if Nominatim is rate-limited; only check key exists
        assert "label" in d


# ---------- Profile ----------
class TestProfile:
    def test_profile_default_after_reset(self, client):
        r = client.get(f"{API}/profile", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["onboarded"] is False
        assert d["user_id"] == "default"

    def test_profile_update(self, client):
        body = {
            "user_id": "default", "name": "TEST_Alex", "greeting_name": "TEST_Alex",
            "onboarded": True, "family_sharing": True, "ai_training": False,
            "notifications": True, "voice_enabled": False,
        }
        r = client.put(f"{API}/profile", json=body, timeout=15)
        assert r.status_code == 200
        # GET to verify persistence
        g = client.get(f"{API}/profile", timeout=15).json()
        assert g["name"] == "TEST_Alex"
        assert g["onboarded"] is True
        assert g["family_sharing"] is True
        assert g["ai_training"] is False
        assert g["voice_enabled"] is False


# ---------- Priorities CRUD ----------
class TestPriorities:
    pid = None

    def test_create(self, client):
        r = client.post(f"{API}/priorities", json={"title": "TEST_Walk", "time": "9am", "category": "Task"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Walk"
        assert d["done"] is False
        TestPriorities.pid = d["id"]

    def test_list(self, client):
        r = client.get(f"{API}/priorities", timeout=15)
        assert r.status_code == 200
        items = r.json()["priorities"]
        assert any(p["id"] == TestPriorities.pid for p in items)

    def test_toggle_done(self, client):
        r = client.put(f"{API}/priorities/{TestPriorities.pid}", json={"done": True}, timeout=15)
        assert r.status_code == 200
        assert r.json()["done"] is True
        # GET verify
        items = client.get(f"{API}/priorities", timeout=15).json()["priorities"]
        p = next(p for p in items if p["id"] == TestPriorities.pid)
        assert p["done"] is True

    def test_delete(self, client):
        r = client.delete(f"{API}/priorities/{TestPriorities.pid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1
        items = client.get(f"{API}/priorities", timeout=15).json()["priorities"]
        assert all(p["id"] != TestPriorities.pid for p in items)

    def test_create_empty_title_400(self, client):
        r = client.post(f"{API}/priorities", json={"title": "  "}, timeout=15)
        assert r.status_code == 400


# ---------- Expenses CRUD ----------
class TestExpenses:
    eid = None

    def test_create(self, client):
        r = client.post(f"{API}/expenses", json={"amount": 12.5, "category": "Food", "note": "TEST_lunch"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 12.5
        TestExpenses.eid = d["id"]

    def test_list_with_total(self, client):
        r = client.get(f"{API}/expenses", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert any(e["id"] == TestExpenses.eid for e in d["expenses"])
        assert d["total"] >= 12.5

    def test_invalid_amount(self, client):
        r = client.post(f"{API}/expenses", json={"amount": 0, "category": "X"}, timeout=15)
        assert r.status_code == 400

    def test_delete(self, client):
        r = client.delete(f"{API}/expenses/{TestExpenses.eid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1


# ---------- Habits ----------
class TestHabits:
    def test_get_today(self, client):
        r = client.get(f"{API}/habits", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("water_glasses", "focused_minutes", "energy_rating", "date"):
            assert k in d

    def test_water_inc_dec(self, client):
        before = client.get(f"{API}/habits", timeout=15).json()["water_glasses"]
        r = client.post(f"{API}/habits/water", timeout=15)
        assert r.status_code == 200
        assert r.json()["water_glasses"] == before + 1
        r2 = client.post(f"{API}/habits/water/decrement", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["water_glasses"] == before

    def test_focus_add(self, client):
        before = client.get(f"{API}/habits", timeout=15).json()["focused_minutes"]
        r = client.post(f"{API}/habits/focus", json={"minutes": 15}, timeout=15)
        assert r.status_code == 200
        assert r.json()["focused_minutes"] == before + 15

    def test_energy_set(self, client):
        r = client.put(f"{API}/habits/energy", json={"rating": 4}, timeout=15)
        assert r.status_code == 200
        assert r.json()["energy_rating"] == 4


# ---------- Morning Brief (POST with location) + AI caching ----------
class TestMorningBrief:
    first_outfit = None
    first_quote = None

    def test_morning_brief_post(self, client):
        r = client.post(f"{API}/brief/morning", json={"lat": LAT, "lon": LON}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("greeting", "name", "date", "weather", "outfit", "quote", "priorities", "quick_actions", "location_label"):
            assert k in d, f"missing key {k}"
        assert d["weather"] is not None and "temp" in d["weather"]
        assert isinstance(d["outfit"], dict) and d["outfit"].get("suggestion")
        assert isinstance(d["quote"], dict) and d["quote"].get("text")
        assert len(d["quick_actions"]) == 4
        TestMorningBrief.first_outfit = d["outfit"]
        TestMorningBrief.first_quote = d["quote"]

    def test_morning_brief_cached(self, client):
        r = client.post(f"{API}/brief/morning", json={"lat": LAT, "lon": LON}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Same day → must be cached and identical
        assert d["outfit"] == TestMorningBrief.first_outfit
        assert d["quote"] == TestMorningBrief.first_quote


# ---------- Evening Brief ----------
class TestEveningBrief:
    def test_evening(self, client):
        # Seed an expense + priority for richer output
        client.post(f"{API}/expenses", json={"amount": 5.5, "category": "Coffee", "note": "TEST"}, timeout=15)
        client.post(f"{API}/priorities", json={"title": "TEST_Read", "category": "Task"}, timeout=15)
        r = client.get(f"{API}/brief/evening", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("summary", "stats", "spending", "insights", "tomorrow"):
            assert k in d
        assert d["spending"]["total"] >= 5.5
        assert isinstance(d["insights"], list) and len(d["insights"]) >= 1


# ---------- Flow Dashboard ----------
class TestDashboard:
    def test_dashboard_5_cards(self, client):
        r = client.get(f"{API}/flow/dashboard", timeout=20)
        assert r.status_code == 200
        cards = r.json()["cards"]
        assert len(cards) == 5
        ids = [c["id"] for c in cards]
        assert ids == ["time", "money", "health", "connections", "energy"]
        for c in cards:
            assert "value" in c and "label" in c


# ---------- Chat ----------
class TestChat:
    sid = f"TEST_{uuid.uuid4()}"

    def test_chat_send(self, client):
        r = client.post(f"{API}/chat", json={"session_id": self.sid, "message": "Say hi in 3 words"}, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["reply"]

    def test_chat_history_clear(self, client):
        r = client.delete(f"{API}/chat/history/{self.sid}", timeout=15)
        assert r.status_code == 200
        h = client.get(f"{API}/chat/history/{self.sid}", timeout=15).json()
        assert h["messages"] == []


# ---------- Reset ----------
class TestReset:
    def test_reset_wipes(self, client):
        # Seed
        client.post(f"{API}/priorities", json={"title": "TEST_reset_p"}, timeout=15)
        client.post(f"{API}/expenses", json={"amount": 1, "category": "X"}, timeout=15)
        client.put(f"{API}/profile", json={"user_id": "default", "name": "TEST_X", "onboarded": True}, timeout=15)
        # Reset
        r = client.delete(f"{API}/profile/reset", timeout=20)
        assert r.status_code == 200
        # Verify wiped
        assert client.get(f"{API}/priorities", timeout=15).json()["priorities"] == []
        assert client.get(f"{API}/expenses", timeout=15).json()["expenses"] == []
        prof = client.get(f"{API}/profile", timeout=15).json()
        assert prof["onboarded"] is False
        assert prof["name"] == ""
