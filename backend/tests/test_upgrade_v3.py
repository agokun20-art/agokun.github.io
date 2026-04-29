"""Tests for Flow upgrade v3: streaks, history, export, regression on existing endpoints."""
import os
import requests
import pytest

BASE_URL = "https://flow-morning-brief-1.preview.emergentagent.com"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Ensure profile exists (onboard default user lightly)
@pytest.fixture(scope="module", autouse=True)
def ensure_profile(session):
    # Do not reset - just ensure profile object exists
    r = session.get(f"{BASE_URL}/api/profile")
    assert r.status_code == 200
    data = r.json()
    # ensure name set so morning brief works
    if not data.get("name"):
        data["name"] = "TEST_User"
        data["greeting_name"] = "TEST_User"
        data["onboarded"] = True
        s = session.put(f"{BASE_URL}/api/profile", json=data)
        assert s.status_code == 200
    yield


# --------- New endpoints ---------

class TestStreaks:
    def test_streaks_shape(self, session):
        r = session.get(f"{BASE_URL}/api/habits/streaks")
        assert r.status_code == 200
        data = r.json()
        for k in ("water_streak", "focus_streak", "water_today_met", "focus_today_met"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["water_streak"], int)
        assert isinstance(data["focus_streak"], int)
        assert isinstance(data["water_today_met"], bool)
        assert isinstance(data["focus_today_met"], bool)


class TestHistory:
    def test_history_default_7(self, session):
        r = session.get(f"{BASE_URL}/api/habits/history")
        assert r.status_code == 200
        data = r.json()
        assert "history" in data
        assert len(data["history"]) == 7
        row = data["history"][0]
        for k in ("date", "water_glasses", "focused_minutes", "energy_rating"):
            assert k in row

    def test_history_custom_days(self, session):
        r = session.get(f"{BASE_URL}/api/habits/history?days=14")
        assert r.status_code == 200
        assert len(r.json()["history"]) == 14

    def test_history_clamps(self, session):
        r = session.get(f"{BASE_URL}/api/habits/history?days=500")
        assert r.status_code == 200
        assert len(r.json()["history"]) == 90


class TestExport:
    def test_export_shape(self, session):
        r = session.get(f"{BASE_URL}/api/profile/export")
        assert r.status_code == 200
        data = r.json()
        for k in ("exported_at", "profile", "priorities", "expenses", "habits"):
            assert k in data
        assert isinstance(data["priorities"], list)
        assert isinstance(data["expenses"], list)
        assert isinstance(data["habits"], list)


# --------- Regression on existing endpoints ---------

class TestRegression:
    def test_root(self, session):
        r = session.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "Flow API" in r.json().get("message", "")

    def test_flow_dashboard(self, session):
        r = session.get(f"{BASE_URL}/api/flow/dashboard")
        assert r.status_code == 200
        assert len(r.json()["cards"]) == 5

    def test_weather(self, session):
        r = session.get(f"{BASE_URL}/api/weather?lat=40.71&lon=-74.01")
        assert r.status_code == 200
        d = r.json()
        assert "temp" in d and "condition" in d

    def test_morning_brief_with_loc(self, session):
        r = session.post(
            f"{BASE_URL}/api/brief/morning",
            json={"lat": 40.71, "lon": -74.01, "label": "New York"},
            timeout=60,
        )
        assert r.status_code == 200
        d = r.json()
        assert "greeting" in d and "quote" in d

    def test_morning_brief_no_body(self, session):
        # api.ts sends no body when coords absent
        r = session.post(f"{BASE_URL}/api/brief/morning", timeout=60)
        assert r.status_code == 200

    def test_evening_brief(self, session):
        r = session.get(f"{BASE_URL}/api/brief/evening", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d and "spending" in d and "insights" in d

    def test_priorities_crud(self, session):
        created = session.post(
            f"{BASE_URL}/api/priorities",
            json={"title": "TEST_v3_priority", "category": "Task"},
        )
        assert created.status_code == 200
        pid = created.json()["id"]
        lst = session.get(f"{BASE_URL}/api/priorities").json()["priorities"]
        assert any(p["id"] == pid for p in lst)
        upd = session.put(
            f"{BASE_URL}/api/priorities/{pid}", json={"done": True}
        )
        assert upd.status_code == 200 and upd.json()["done"] is True
        d = session.delete(f"{BASE_URL}/api/priorities/{pid}")
        assert d.status_code == 200

    def test_expenses_crud(self, session):
        created = session.post(
            f"{BASE_URL}/api/expenses",
            json={"amount": 4.25, "category": "coffee", "note": "TEST_v3"},
        )
        assert created.status_code == 200
        eid = created.json()["id"]
        d = session.delete(f"{BASE_URL}/api/expenses/{eid}")
        assert d.status_code == 200

    def test_habits_increment(self, session):
        # increment & decrement water
        before = session.get(f"{BASE_URL}/api/habits").json()
        inc = session.post(f"{BASE_URL}/api/habits/water")
        assert inc.status_code == 200
        assert inc.json()["water_glasses"] == before["water_glasses"] + 1
        dec = session.post(f"{BASE_URL}/api/habits/water/decrement")
        assert dec.status_code == 200

    def test_habits_focus_and_energy(self, session):
        r = session.post(f"{BASE_URL}/api/habits/focus", json={"minutes": 5})
        assert r.status_code == 200
        assert r.json()["focused_minutes"] >= 5
        e = session.put(f"{BASE_URL}/api/habits/energy", json={"rating": 3})
        assert e.status_code == 200
        assert e.json()["energy_rating"] == 3

    def test_chat_suggestions(self, session):
        r = session.get(f"{BASE_URL}/api/chat/suggestions")
        assert r.status_code == 200
        assert len(r.json()["suggestions"]) >= 4
