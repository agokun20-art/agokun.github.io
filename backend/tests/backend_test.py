"""Backend API tests for Flow - AI-powered Daily Life OS."""
import os
import uuid
import time
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / '.env')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
# Fallback: read from frontend .env
if not BASE_URL:
    fe = Path('/app/frontend/.env').read_text()
    for line in fe.splitlines():
        if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().strip('"')
            break
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ------------------ Root / Health ------------------
class TestRoot:
    def test_root(self, client):
        r = client.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data


# ------------------ Morning Brief ------------------
class TestMorningBrief:
    def test_morning_brief_structure(self, client):
        r = client.get(f"{API}/brief/morning", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for key in ["greeting", "name", "date", "weather", "outfit", "priorities", "quote", "quick_actions"]:
            assert key in d, f"Missing field: {key}"
        assert isinstance(d["priorities"], list) and len(d["priorities"]) == 3
        assert isinstance(d["quick_actions"], list) and len(d["quick_actions"]) == 4
        assert d["name"] == "Alex"
        assert "temp" in d["weather"]
        assert "suggestion" in d["outfit"]
        # priorities have required fields
        for p in d["priorities"]:
            for k in ["id", "title", "time", "category", "done"]:
                assert k in p


# ------------------ Evening Brief ------------------
class TestEveningBrief:
    def test_evening_brief_structure(self, client):
        r = client.get(f"{API}/brief/evening", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for key in ["date", "summary", "stats", "spending", "insights", "tomorrow", "reflection_prompt"]:
            assert key in d
        assert "breakdown" in d["spending"]
        assert isinstance(d["spending"]["breakdown"], list) and len(d["spending"]["breakdown"]) >= 1
        assert isinstance(d["insights"], list) and len(d["insights"]) >= 1
        assert "first_event" in d["tomorrow"]


# ------------------ Flow Dashboard ------------------
class TestFlowDashboard:
    def test_dashboard_cards(self, client):
        r = client.get(f"{API}/flow/dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "cards" in d
        assert len(d["cards"]) == 5
        ids = [c["id"] for c in d["cards"]]
        for expected in ["time", "money", "health", "connections", "energy"]:
            assert expected in ids
        for c in d["cards"]:
            for k in ["id", "title", "icon", "value", "label", "delta", "accent"]:
                assert k in c, f"Card {c.get('id')} missing {k}"


# ------------------ Chat Suggestions ------------------
class TestChatSuggestions:
    def test_suggestions_count(self, client):
        r = client.get(f"{API}/chat/suggestions", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "suggestions" in d
        assert len(d["suggestions"]) == 6
        for s in d["suggestions"]:
            for k in ["id", "label", "icon"]:
                assert k in s


# ------------------ Profile CRUD ------------------
class TestProfile:
    def test_get_default_profile(self, client):
        r = client.get(f"{API}/profile", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["user_id", "name", "family_sharing", "ai_training", "notifications", "voice_enabled"]:
            assert k in d
        assert "_id" not in d

    def test_update_and_persist_profile(self, client):
        # Get current
        current = client.get(f"{API}/profile", timeout=30).json()
        updated = dict(current)
        updated["name"] = "TEST_Flow_User"
        updated["family_sharing"] = not current.get("family_sharing", False)
        updated["ai_training"] = not current.get("ai_training", True)

        r = client.put(f"{API}/profile", json=updated, timeout=30)
        assert r.status_code == 200, f"PUT failed: {r.text}"
        body = r.json()
        assert body["name"] == "TEST_Flow_User"
        assert body["family_sharing"] == updated["family_sharing"]

        # Verify persistence
        r2 = client.get(f"{API}/profile", timeout=30)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["name"] == "TEST_Flow_User"
        assert d2["family_sharing"] == updated["family_sharing"]
        assert d2["ai_training"] == updated["ai_training"]

        # Restore
        client.put(f"{API}/profile", json=current, timeout=30)


# ------------------ Chat (Real Claude) ------------------
class TestChat:
    session_id = f"TEST_{uuid.uuid4().hex[:10]}"

    def test_chat_empty_message(self, client):
        r = client.post(f"{API}/chat", json={"session_id": self.session_id, "message": "   "}, timeout=30)
        assert r.status_code == 400

    def test_chat_real_response(self, client):
        r = client.post(
            f"{API}/chat",
            json={"session_id": self.session_id, "message": "Say hi in exactly 3 words."},
            timeout=90,
        )
        assert r.status_code == 200, f"Chat failed: {r.status_code} {r.text}"
        d = r.json()
        assert d["session_id"] == self.session_id
        assert isinstance(d["reply"], str)
        assert len(d["reply"].strip()) > 0
        assert "created_at" in d

    def test_chat_history_order(self, client):
        # send a second message
        r = client.post(
            f"{API}/chat",
            json={"session_id": self.session_id, "message": "And one more short hello."},
            timeout=90,
        )
        assert r.status_code == 200

        r2 = client.get(f"{API}/chat/history/{self.session_id}", timeout=30)
        assert r2.status_code == 200
        d = r2.json()
        msgs = d["messages"]
        assert len(msgs) >= 4  # 2 user + 2 assistant
        roles = [m["role"] for m in msgs]
        # Should alternate starting with user
        assert roles[0] == "user"
        # chronological
        times = [m["created_at"] for m in msgs]
        assert times == sorted(times)
        # no _id leak
        for m in msgs:
            assert "_id" not in m

    def test_clear_chat_history(self, client):
        r = client.delete(f"{API}/chat/history/{self.session_id}", timeout=30)
        assert r.status_code == 200
        assert r.json()["deleted"] >= 1

        r2 = client.get(f"{API}/chat/history/{self.session_id}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["messages"] == []
