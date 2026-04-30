"""Backend tests for Flow v1.2 — Intention, Journal, Rituals, Parse, Weekly brief,
updated Morning brief (intention + north_star), and updated Profile reset/export.
Includes regression smoke for key v1 endpoints."""
import os
import uuid
import time
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
LAT, LON = 40.71, -74.01


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def reset_state(client):
    client.delete(f"{API}/profile/reset", timeout=20)
    yield
    client.delete(f"{API}/profile/reset", timeout=20)


# ---------- Intention ----------
class TestIntention:
    def test_get_default_empty(self, client):
        r = client.get(f"{API}/intention", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["word"] == ""
        assert "date" in d

    def test_put_upsert_and_get(self, client):
        r = client.put(f"{API}/intention", json={"word": "Focused", "note": "one thing at a time"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["word"] == "Focused"
        assert d["note"] == "one thing at a time"
        # Verify persisted via GET
        g = client.get(f"{API}/intention", timeout=15).json()
        assert g["word"] == "Focused"
        assert g["note"] == "one thing at a time"

    def test_truncation(self, client):
        long_word = "A" * 50
        long_note = "B" * 200
        r = client.put(f"{API}/intention", json={"word": long_word, "note": long_note}, timeout=15)
        d = r.json()
        assert len(d["word"]) <= 28
        assert len(d["note"]) <= 140


# ---------- Journal ----------
class TestJournal:
    jid = None

    def test_create_with_reflection(self, client):
        payload = {"content": "TEST_ I felt calm today after a slow walk. Small steps."}
        r = client.post(f"{API}/journal", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["content"].startswith("TEST_")
        assert d.get("reflection"), "reflection must be populated by AI"
        assert isinstance(d["reflection"], str) and len(d["reflection"]) > 0
        TestJournal.jid = d["id"]

    def test_list_contains_entry(self, client):
        r = client.get(f"{API}/journal", timeout=15)
        assert r.status_code == 200
        entries = r.json()["entries"]
        assert any(e["id"] == TestJournal.jid for e in entries)

    def test_empty_content_400(self, client):
        r = client.post(f"{API}/journal", json={"content": "   "}, timeout=15)
        assert r.status_code == 400

    def test_delete(self, client):
        r = client.delete(f"{API}/journal/{TestJournal.jid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1
        entries = client.get(f"{API}/journal", timeout=15).json()["entries"]
        assert all(e["id"] != TestJournal.jid for e in entries)


# ---------- Rituals ----------
class TestRituals:
    rid = None

    def test_create(self, client):
        body = {"name": "TEST_Morning", "emoji": "🌅", "steps": ["Stretch", "Water", "Breathe"]}
        r = client.post(f"{API}/rituals", json=body, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_Morning"
        assert d["steps"] == ["Stretch", "Water", "Breathe"]
        assert d["completed_today"] is False
        TestRituals.rid = d["id"]

    def test_create_validation(self, client):
        r = client.post(f"{API}/rituals", json={"name": "", "steps": ["x"]}, timeout=15)
        assert r.status_code == 400
        r = client.post(f"{API}/rituals", json={"name": "X", "steps": []}, timeout=15)
        assert r.status_code == 400

    def test_list_has_completed_today(self, client):
        r = client.get(f"{API}/rituals", timeout=15)
        assert r.status_code == 200
        items = r.json()["rituals"]
        mine = next(x for x in items if x["id"] == TestRituals.rid)
        assert mine["completed_today"] is False

    def test_complete_and_undo(self, client):
        r = client.post(f"{API}/rituals/{TestRituals.rid}/complete", timeout=15)
        assert r.status_code == 200
        items = client.get(f"{API}/rituals", timeout=15).json()["rituals"]
        mine = next(x for x in items if x["id"] == TestRituals.rid)
        assert mine["completed_today"] is True

        r = client.post(f"{API}/rituals/{TestRituals.rid}/undo", timeout=15)
        assert r.status_code == 200
        items = client.get(f"{API}/rituals", timeout=15).json()["rituals"]
        mine = next(x for x in items if x["id"] == TestRituals.rid)
        assert mine["completed_today"] is False

    def test_delete_removes_ritual_and_completions(self, client):
        # mark complete first
        client.post(f"{API}/rituals/{TestRituals.rid}/complete", timeout=15)
        r = client.delete(f"{API}/rituals/{TestRituals.rid}", timeout=15)
        assert r.status_code == 200
        items = client.get(f"{API}/rituals", timeout=15).json()["rituals"]
        assert all(x["id"] != TestRituals.rid for x in items)


# ---------- Parse priority ----------
class TestParsePriority:
    def test_call_mom_tomorrow_3pm(self, client):
        r = client.post(f"{API}/parse/priority",
                        json={"text": "call mom tomorrow 3pm about birthday"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["category"] == "Connect", f"got {d}"
        # Time should be parsed to 3:00 PM (allow some variation)
        assert "3" in d["time"] and "PM" in d["time"].upper(), f"got time {d['time']}"
        assert "mom" in d["title"].lower() or "call" in d["title"].lower()

    def test_empty_text_400(self, client):
        r = client.post(f"{API}/parse/priority", json={"text": "  "}, timeout=15)
        assert r.status_code == 400


# ---------- Weekly brief ----------
class TestWeekly:
    def test_weekly_structure(self, client):
        r = client.get(f"{API}/brief/weekly", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "range" in d and "start" in d["range"] and "end" in d["range"]
        assert isinstance(d["narrative"], str) and len(d["narrative"]) > 0
        assert "totals" in d
        for k in ("focus_minutes", "water_glasses", "spent", "priorities_done", "journal_entries"):
            assert k in d["totals"]


# ---------- Morning brief: intention + north_star ----------
class TestMorningBriefV12:
    def test_north_star_picks_timed_first(self, client):
        # Setup: create two undone priorities, one with time
        client.post(f"{API}/priorities", json={"title": "TEST_NoTime"}, timeout=15)
        time.sleep(0.05)
        p2 = client.post(f"{API}/priorities",
                         json={"title": "TEST_WithTime", "time": "10:00 AM", "category": "Work"},
                         timeout=15).json()
        # Set intention
        client.put(f"{API}/intention", json={"word": "Calm", "note": ""}, timeout=15)

        r = client.post(f"{API}/brief/morning", json={"lat": LAT, "lon": LON}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "intention" in d
        assert d["intention"] is not None
        assert d["intention"]["word"] == "Calm"
        assert "north_star" in d
        assert d["north_star"] is not None
        assert d["north_star"]["id"] == p2["id"], f"expected timed priority first, got {d['north_star']}"

    def test_north_star_none_when_all_done(self, client):
        # Mark all undone done
        items = client.get(f"{API}/priorities", timeout=15).json()["priorities"]
        for p in items:
            if not p.get("done"):
                client.put(f"{API}/priorities/{p['id']}", json={"done": True}, timeout=15)
        r = client.post(f"{API}/brief/morning", json={"lat": LAT, "lon": LON}, timeout=60)
        assert r.status_code == 200
        assert r.json()["north_star"] is None


# ---------- Profile export v1.2 (includes intentions, journal, rituals) ----------
class TestExportV12:
    def test_export_contains_new_fields(self, client):
        # seed
        client.put(f"{API}/intention", json={"word": "Bold", "note": ""}, timeout=15)
        client.post(f"{API}/journal", json={"content": "TEST_export entry"}, timeout=60)
        client.post(f"{API}/rituals", json={"name": "TEST_Exp", "steps": ["a"], "emoji": "🔥"}, timeout=15)

        r = client.get(f"{API}/profile/export", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("intentions", "journal", "rituals", "profile", "priorities", "expenses", "habits"):
            assert k in d, f"missing {k} in export"
        assert any(i.get("word") == "Bold" for i in d["intentions"])
        assert any(j.get("content", "").startswith("TEST_") for j in d["journal"])
        assert any(r.get("name") == "TEST_Exp" for r in d["rituals"])


# ---------- Reset wipes new collections ----------
class TestResetV12:
    def test_reset_wipes_new_collections(self, client):
        client.put(f"{API}/intention", json={"word": "X", "note": ""}, timeout=15)
        client.post(f"{API}/journal", json={"content": "TEST_reset"}, timeout=60)
        rr = client.post(f"{API}/rituals", json={"name": "TEST_R", "steps": ["a"]}, timeout=15).json()
        client.post(f"{API}/rituals/{rr['id']}/complete", timeout=15)

        r = client.delete(f"{API}/profile/reset", timeout=20)
        assert r.status_code == 200
        assert client.get(f"{API}/journal", timeout=15).json()["entries"] == []
        assert client.get(f"{API}/rituals", timeout=15).json()["rituals"] == []
        intention = client.get(f"{API}/intention", timeout=15).json()
        assert intention["word"] == ""


# ---------- Regression smoke ----------
class TestRegression:
    def test_weather(self, client):
        r = client.get(f"{API}/weather", params={"lat": LAT, "lon": LON}, timeout=20)
        assert r.status_code == 200
        assert "temp" in r.json()

    def test_priorities_crud(self, client):
        p = client.post(f"{API}/priorities", json={"title": "TEST_reg"}, timeout=15).json()
        items = client.get(f"{API}/priorities", timeout=15).json()["priorities"]
        assert any(x["id"] == p["id"] for x in items)
        client.delete(f"{API}/priorities/{p['id']}", timeout=15)

    def test_habits_streaks(self, client):
        r = client.get(f"{API}/habits/streaks", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("water_streak", "focus_streak", "water_today_met", "focus_today_met"):
            assert k in d

    def test_chat(self, client):
        sid = f"TEST_{uuid.uuid4()}"
        r = client.post(f"{API}/chat", json={"session_id": sid, "message": "hi in 3 words"}, timeout=60)
        assert r.status_code == 200
        assert r.json()["reply"]
        client.delete(f"{API}/chat/history/{sid}", timeout=15)
