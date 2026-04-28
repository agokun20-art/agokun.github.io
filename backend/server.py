from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="Flow API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ------------------ Helpers ------------------

DEFAULT_USER = "default"

def today_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


WEATHER_CODE_MAP = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy", 48: "Foggy",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Violent showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail",
}


def weather_icon_name(code: int, is_day: int) -> str:
    if code == 0:
        return "sunny" if is_day else "moon"
    if code in (1, 2):
        return "partly-sunny" if is_day else "cloudy-night"
    if code == 3:
        return "cloudy"
    if code in (45, 48):
        return "cloudy"
    if 51 <= code <= 67:
        return "rainy"
    if 71 <= code <= 86:
        return "snow"
    if code >= 95:
        return "thunderstorm"
    return "partly-sunny"


# ------------------ Models ------------------

class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str
    content: str
    created_at: str = Field(default_factory=now_iso)


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    created_at: str


class ProfileModel(BaseModel):
    user_id: str = DEFAULT_USER
    name: str = ""
    greeting_name: str = ""
    onboarded: bool = False
    family_sharing: bool = False
    ai_training: bool = True
    notifications: bool = True
    voice_enabled: bool = True
    theme: str = "dark"
    pro_member: bool = False
    last_lat: Optional[float] = None
    last_lon: Optional[float] = None
    location_label: Optional[str] = None
    water_goal: int = 8
    focus_goal: int = 180


class PriorityCreate(BaseModel):
    title: str
    time: Optional[str] = None
    category: Optional[str] = "Task"


class PriorityUpdate(BaseModel):
    title: Optional[str] = None
    time: Optional[str] = None
    category: Optional[str] = None
    done: Optional[bool] = None


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    note: Optional[str] = ""
    date: Optional[str] = None  # YYYY-MM-DD


class HabitFocusInput(BaseModel):
    minutes: int


class HabitEnergyInput(BaseModel):
    rating: int  # 1-5


class WeatherLoc(BaseModel):
    lat: float
    lon: float
    label: Optional[str] = None


# ------------------ Weather ------------------

async def fetch_weather(lat: float, lon: float) -> dict:
    def _get():
        r = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,weather_code,wind_speed_10m,is_day,relative_humidity_2m",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "temperature_unit": "fahrenheit",
                "wind_speed_unit": "mph",
                "timezone": "auto",
            },
            timeout=12,
        )
        r.raise_for_status()
        return r.json()

    data = await run_in_threadpool(_get)
    current = data.get("current", {})
    daily = data.get("daily", {})
    code = int(current.get("weather_code", 0))
    is_day = int(current.get("is_day", 1))
    condition = WEATHER_CODE_MAP.get(code, "Clear")
    temp = round(current.get("temperature_2m", 0))
    wind = round(current.get("wind_speed_10m", 0))
    high = round((daily.get("temperature_2m_max") or [temp])[0])
    low = round((daily.get("temperature_2m_min") or [temp])[0])
    rain_prob = (daily.get("precipitation_probability_max") or [0])[0]
    return {
        "temp": temp,
        "unit": "F",
        "condition": condition,
        "code": code,
        "is_day": is_day,
        "high": high,
        "low": low,
        "wind_mph": wind,
        "rain_probability": rain_prob,
        "icon": weather_icon_name(code, is_day),
        "timezone": data.get("timezone"),
    }


async def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    def _get():
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
                headers={"User-Agent": "flow-app/1.0"},
                timeout=8,
            )
            if r.status_code != 200:
                return None
            return r.json()
        except Exception:
            return None

    data = await run_in_threadpool(_get)
    if not data:
        return None
    addr = data.get("address", {})
    return (
        addr.get("city")
        or addr.get("town")
        or addr.get("village")
        or addr.get("county")
        or addr.get("state")
    )


@api_router.get("/weather")
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    try:
        weather = await fetch_weather(lat, lon)
        label = await reverse_geocode(lat, lon)
        weather["label"] = label
        return weather
    except Exception as e:
        logger.exception("weather fail")
        raise HTTPException(status_code=502, detail=f"Weather unavailable: {e}")


# ------------------ Priorities ------------------

@api_router.get("/priorities")
async def list_priorities(user_id: str = DEFAULT_USER):
    docs = await db.priorities.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"priorities": docs}


@api_router.post("/priorities")
async def create_priority(body: PriorityCreate, user_id: str = DEFAULT_USER):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": body.title.strip(),
        "time": body.time or "",
        "category": body.category or "Task",
        "done": False,
        "done_at": None,
        "created_at": now_iso(),
    }
    if not doc["title"]:
        raise HTTPException(status_code=400, detail="Title required")
    await db.priorities.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api_router.put("/priorities/{pid}")
async def update_priority(pid: str, body: PriorityUpdate, user_id: str = DEFAULT_USER):
    update: dict = {}
    for k, v in body.dict(exclude_unset=True).items():
        update[k] = v
    if "done" in update and update["done"]:
        update["done_at"] = now_iso()
    if "done" in update and not update["done"]:
        update["done_at"] = None
    result = await db.priorities.update_one(
        {"id": pid, "user_id": user_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.priorities.find_one({"id": pid}, {"_id": 0})
    return doc


@api_router.delete("/priorities/{pid}")
async def delete_priority(pid: str, user_id: str = DEFAULT_USER):
    result = await db.priorities.delete_one({"id": pid, "user_id": user_id})
    return {"deleted": result.deleted_count}


# ------------------ Expenses ------------------

@api_router.get("/expenses")
async def list_expenses(user_id: str = DEFAULT_USER, date: Optional[str] = None):
    q = {"user_id": user_id}
    if date:
        q["date"] = date
    docs = await db.expenses.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    total = sum(d.get("amount", 0) for d in docs)
    return {"expenses": docs, "total": round(total, 2)}


@api_router.post("/expenses")
async def create_expense(body: ExpenseCreate, user_id: str = DEFAULT_USER):
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": round(float(body.amount), 2),
        "category": body.category,
        "note": body.note or "",
        "date": body.date or today_iso(),
        "created_at": now_iso(),
    }
    await db.expenses.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str, user_id: str = DEFAULT_USER):
    result = await db.expenses.delete_one({"id": eid, "user_id": user_id})
    return {"deleted": result.deleted_count}


# ------------------ Habits (today) ------------------

async def get_or_create_habit(user_id: str, date: str) -> dict:
    doc = await db.habits.find_one({"user_id": user_id, "date": date}, {"_id": 0})
    if doc:
        return doc
    new = {
        "user_id": user_id,
        "date": date,
        "water_glasses": 0,
        "focused_minutes": 0,
        "energy_rating": 0,
        "created_at": now_iso(),
    }
    await db.habits.insert_one(new.copy())
    new.pop("_id", None)
    return new


@api_router.get("/habits")
async def get_habits(user_id: str = DEFAULT_USER, date: Optional[str] = None):
    d = date or today_iso()
    return await get_or_create_habit(user_id, d)


@api_router.post("/habits/water")
async def increment_water(user_id: str = DEFAULT_USER):
    d = today_iso()
    await get_or_create_habit(user_id, d)
    await db.habits.update_one(
        {"user_id": user_id, "date": d},
        {"$inc": {"water_glasses": 1}},
    )
    return await db.habits.find_one({"user_id": user_id, "date": d}, {"_id": 0})


@api_router.post("/habits/water/decrement")
async def decrement_water(user_id: str = DEFAULT_USER):
    d = today_iso()
    doc = await get_or_create_habit(user_id, d)
    new_val = max(0, doc.get("water_glasses", 0) - 1)
    await db.habits.update_one(
        {"user_id": user_id, "date": d},
        {"$set": {"water_glasses": new_val}},
    )
    return await db.habits.find_one({"user_id": user_id, "date": d}, {"_id": 0})


@api_router.post("/habits/focus")
async def add_focus(body: HabitFocusInput, user_id: str = DEFAULT_USER):
    d = today_iso()
    await get_or_create_habit(user_id, d)
    await db.habits.update_one(
        {"user_id": user_id, "date": d},
        {"$inc": {"focused_minutes": max(0, int(body.minutes))}},
    )
    return await db.habits.find_one({"user_id": user_id, "date": d}, {"_id": 0})


@api_router.put("/habits/energy")
async def set_energy(body: HabitEnergyInput, user_id: str = DEFAULT_USER):
    rating = max(0, min(5, int(body.rating)))
    d = today_iso()
    await get_or_create_habit(user_id, d)
    await db.habits.update_one(
        {"user_id": user_id, "date": d},
        {"$set": {"energy_rating": rating}},
    )
    return await db.habits.find_one({"user_id": user_id, "date": d}, {"_id": 0})


# ------------------ Profile ------------------

async def get_profile_doc(user_id: str = DEFAULT_USER) -> dict:
    doc = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        profile = ProfileModel(user_id=user_id)
        await db.profiles.insert_one(profile.dict())
        return profile.dict()
    return doc


@api_router.get("/profile")
async def get_profile(user_id: str = DEFAULT_USER):
    return await get_profile_doc(user_id)


@api_router.put("/profile")
async def update_profile(profile: ProfileModel):
    data = profile.dict()
    await db.profiles.update_one(
        {"user_id": data["user_id"]},
        {"$set": data},
        upsert=True,
    )
    return data


# ------------------ AI generation (cached daily) ------------------

async def cached_ai(user_id: str, date: str, kind: str, generator):
    key = {"user_id": user_id, "date": date, "kind": kind}
    existing = await db.ai_cache.find_one(key, {"_id": 0})
    if existing and existing.get("content"):
        return existing["content"]
    content = await generator()
    await db.ai_cache.update_one(
        key, {"$set": {**key, "content": content, "created_at": now_iso()}}, upsert=True,
    )
    return content


async def generate_outfit(weather: dict, name: str) -> dict:
    prompt = (
        f"Weather right now: {weather['temp']}°F, {weather['condition']}, "
        f"wind {weather['wind_mph']} mph, rain chance {weather['rain_probability']}%. "
        f"High {weather['high']}°F, low {weather['low']}°F.\n"
        "Suggest one outfit in ONE short sentence (max 14 words), separating pieces with '·'. "
        "Then add a separate one-sentence reason (max 12 words). "
        "Return ONLY raw JSON: {\"suggestion\": \"...\", \"reason\": \"...\"}"
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"outfit-{uuid.uuid4()}",
            system_message="You are Flow, a warm style assistant. Be concise.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=prompt))
        start = reply.find("{")
        end = reply.rfind("}")
        if start >= 0 and end > start:
            obj = json.loads(reply[start:end + 1])
            return {
                "suggestion": str(obj.get("suggestion", "")).strip(),
                "reason": str(obj.get("reason", "")).strip(),
            }
    except Exception:
        logger.exception("outfit gen failed")
    # Fallback
    if weather["temp"] >= 75:
        return {"suggestion": "Light tee · breathable shorts · sneakers",
                "reason": "Warm and calm — stay cool."}
    if weather["temp"] >= 60:
        return {"suggestion": "Linen shirt · chinos · clean sneakers",
                "reason": "Mild day — light layers are enough."}
    if weather["temp"] >= 45:
        return {"suggestion": "Knit sweater · jeans · low boots",
                "reason": "Cool — layer for comfort."}
    return {"suggestion": "Wool coat · scarf · insulated boots",
            "reason": "Cold — bundle up and stay warm."}


async def generate_quote(name: str) -> dict:
    prompt = (
        "Write one short, warm, original morning micro-quote for someone starting their day. "
        "Max 14 words. No hashtags. Return ONLY raw JSON: {\"text\":\"...\", \"author\":\"Flow\"}"
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quote-{uuid.uuid4()}",
            system_message="You are Flow, a calm daily companion. Be human, not cliché.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=prompt))
        start = reply.find("{")
        end = reply.rfind("}")
        if start >= 0 and end > start:
            obj = json.loads(reply[start:end + 1])
            return {
                "text": str(obj.get("text", "")).strip() or "Today is quietly yours.",
                "author": str(obj.get("author", "Flow")),
            }
    except Exception:
        logger.exception("quote gen failed")
    return {"text": "Today is quietly yours.", "author": "Flow"}


async def generate_insights(name: str, priorities_done: int, priorities_total: int,
                            water: int, water_goal: int, focus: int, focus_goal: int,
                            spent: float) -> List[str]:
    context = (
        f"Day recap for {name}. Priorities done {priorities_done}/{priorities_total}. "
        f"Water {water}/{water_goal} glasses. Focus {focus}/{focus_goal} min. "
        f"Spent ${spent:.2f}."
    )
    prompt = (
        context + "\nReturn 3 short, warm, specific observations (max 14 words each). "
        "Return ONLY raw JSON array of strings."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{uuid.uuid4()}",
            system_message="You are Flow, gentle and kind. Celebrate small wins, never shame.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=prompt))
        start = reply.find("[")
        end = reply.rfind("]")
        if start >= 0 and end > start:
            arr = json.loads(reply[start:end + 1])
            return [str(x).strip() for x in arr][:3]
    except Exception:
        logger.exception("insights gen failed")
    out = []
    if priorities_total == 0:
        out.append("No priorities today — rest counts too.")
    else:
        out.append(f"You completed {priorities_done} of {priorities_total} priorities.")
    out.append(f"Water: {water} of {water_goal} glasses.")
    if focus >= focus_goal:
        out.append("Focus goal met — beautiful work.")
    else:
        out.append(f"Focused for {focus} min today.")
    return out[:3]


# ------------------ Brief: Morning ------------------

@api_router.post("/brief/morning")
async def morning_brief(loc: Optional[WeatherLoc] = None, user_id: str = DEFAULT_USER):
    profile = await get_profile_doc(user_id)
    name = (profile.get("greeting_name") or profile.get("name") or "friend").strip() or "friend"
    now = datetime.now()
    hour = now.hour
    greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 17 else "Good evening"

    weather = None
    location_label = profile.get("location_label")
    lat = loc.lat if loc else profile.get("last_lat")
    lon = loc.lon if loc else profile.get("last_lon")
    if lat is not None and lon is not None:
        try:
            weather = await fetch_weather(lat, lon)
            label = loc.label if (loc and loc.label) else await reverse_geocode(lat, lon)
            if label:
                location_label = label
                weather["label"] = label
            else:
                weather["label"] = location_label
            await db.profiles.update_one(
                {"user_id": user_id},
                {"$set": {"last_lat": lat, "last_lon": lon, "location_label": location_label}},
                upsert=True,
            )
        except Exception:
            logger.exception("weather failed in morning brief")

    outfit = None
    quote = None
    date_key = today_iso()
    if weather:
        outfit = await cached_ai(
            user_id, date_key, "outfit", lambda: generate_outfit(weather, name)
        )
    quote = await cached_ai(
        user_id, date_key, "quote", lambda: generate_quote(name)
    )

    priorities = await db.priorities.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    priorities_done = sum(1 for p in priorities if p.get("done"))

    return {
        "greeting": greeting,
        "name": name,
        "date": now.strftime("%A, %B %d"),
        "location_label": location_label,
        "weather": weather,
        "outfit": outfit,
        "quote": quote,
        "priorities": priorities,
        "priorities_done": priorities_done,
        "quick_actions": [
            {"id": "qa1", "label": "Log water", "icon": "droplet", "action": "water"},
            {"id": "qa2", "label": "+15m focus", "icon": "focus", "action": "focus"},
            {"id": "qa3", "label": "Add expense", "icon": "expense", "action": "expense"},
            {"id": "qa4", "label": "Ask Flow", "icon": "ask", "action": "chat"},
        ],
    }


# ------------------ Brief: Evening ------------------

@api_router.get("/brief/evening")
async def evening_brief(user_id: str = DEFAULT_USER):
    profile = await get_profile_doc(user_id)
    name = (profile.get("greeting_name") or profile.get("name") or "friend").strip() or "friend"
    d = today_iso()
    priorities = await db.priorities.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    done = sum(1 for p in priorities if p.get("done"))
    total = len(priorities)
    habit = await get_or_create_habit(user_id, d)
    exp_docs = await db.expenses.find(
        {"user_id": user_id, "date": d}, {"_id": 0}
    ).to_list(500)
    exp_total = round(sum(e["amount"] for e in exp_docs), 2)
    by_cat: dict = {}
    for e in exp_docs:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + e["amount"]
    breakdown = [
        {"category": c, "amount": round(a, 2)} for c, a in sorted(by_cat.items(), key=lambda x: -x[1])
    ]

    # tomorrow's hint = first undone priority
    tomorrow_first = next((p for p in priorities if not p.get("done")), None)

    if total > 0 and done == total:
        summary = f"Beautiful — every priority checked. Well done, {name}."
    elif done > 0:
        summary = f"You moved forward on {done} of {total} priorities. That counts."
    elif total > 0:
        summary = "A gentle day. Tomorrow is a fresh page."
    else:
        summary = "A quiet day. That's enough."

    insights = await generate_insights(
        name, done, total,
        habit.get("water_glasses", 0), profile.get("water_goal", 8),
        habit.get("focused_minutes", 0), profile.get("focus_goal", 180),
        exp_total,
    )

    return {
        "date": datetime.now().strftime("%A, %B %d"),
        "summary": summary,
        "stats": {
            "water_glasses": habit.get("water_glasses", 0),
            "water_goal": profile.get("water_goal", 8),
            "focused_minutes": habit.get("focused_minutes", 0),
            "focus_goal": profile.get("focus_goal", 180),
            "energy_rating": habit.get("energy_rating", 0),
            "priorities_done": done,
            "priorities_total": total,
        },
        "spending": {
            "total": exp_total,
            "currency": "USD",
            "breakdown": breakdown,
        },
        "insights": insights,
        "tomorrow": {
            "first_event": tomorrow_first["title"] if tomorrow_first else "Nothing yet — add a priority",
            "first_event_time": tomorrow_first.get("time", "") if tomorrow_first else "",
        },
        "reflection_prompt": "What is one small thing that went well today?",
    }


# ------------------ Flow Dashboard (computed) ------------------

@api_router.get("/flow/dashboard")
async def flow_dashboard(user_id: str = DEFAULT_USER):
    profile = await get_profile_doc(user_id)
    d = today_iso()
    habit = await get_or_create_habit(user_id, d)
    priorities = await db.priorities.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    done = sum(1 for p in priorities if p.get("done"))
    total = len(priorities)
    exp_total = 0.0
    async for e in db.expenses.find({"user_id": user_id, "date": d}):
        exp_total += e.get("amount", 0)
    exp_total = round(exp_total, 2)

    focus_min = habit.get("focused_minutes", 0)
    focus_goal = profile.get("focus_goal", 180)
    water = habit.get("water_glasses", 0)
    water_goal = profile.get("water_goal", 8)
    energy = habit.get("energy_rating", 0)
    connect_count = sum(
        1 for p in priorities if (p.get("category") or "").lower() == "connect"
    )

    def fmt_hm(m: int) -> str:
        h, mm = divmod(int(m), 60)
        if h == 0:
            return f"{mm}m"
        return f"{h}h {mm}m" if mm else f"{h}h"

    return {
        "cards": [
            {
                "id": "time",
                "title": "Time",
                "icon": "clock",
                "value": fmt_hm(focus_min),
                "label": f"of {fmt_hm(focus_goal)} focus goal",
                "delta": f"{done}/{total} priorities" if total else "No priorities yet",
                "progress": min(1.0, focus_min / focus_goal) if focus_goal else 0,
                "positive": True,
                "accent": "#FFFFFF",
            },
            {
                "id": "money",
                "title": "Money",
                "icon": "wallet",
                "value": f"${exp_total:.2f}",
                "label": "spent today",
                "delta": "Tap to add expense",
                "progress": 0,
                "positive": True,
                "accent": "#D4D4D4",
            },
            {
                "id": "health",
                "title": "Health",
                "icon": "heart-pulse",
                "value": f"{water}/{water_goal}",
                "label": "water today",
                "delta": "Tap + to log" if water < water_goal else "Goal reached",
                "progress": min(1.0, water / water_goal) if water_goal else 0,
                "positive": True,
                "accent": "#B8B8B8",
            },
            {
                "id": "connections",
                "title": "Connections",
                "icon": "users",
                "value": str(connect_count),
                "label": "check-ins planned",
                "delta": "Tag a priority as 'Connect'",
                "progress": 0,
                "positive": True,
                "accent": "#9A9A9A",
            },
            {
                "id": "energy",
                "title": "Energy",
                "icon": "battery",
                "value": f"{energy * 20}%" if energy else "—",
                "label": "self-reported today",
                "delta": "Tap a dot to update" if not energy else "Thanks for checking in",
                "progress": energy / 5 if energy else 0,
                "energy_rating": energy,
                "positive": True,
                "accent": "#7A7A7A",
            },
        ]
    }


# ------------------ Chat ------------------

SYSTEM_PROMPT = (
    "You are Flow — a calm, warm, AI best friend who helps people with tiny "
    "daily decisions: what to eat, what to wear, where to go, how to feel better. "
    "Be concise (max 3 short sentences or a short bulleted list), confident, "
    "gentle, and specific. Use plain language. Avoid disclaimers. Avoid emoji "
    "unless it adds clear delight. Never mention you are an AI — you are Flow."
)


@api_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key not configured")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    user_msg = ChatMessage(session_id=req.session_id, role="user", content=req.message)
    await db.chat_messages.insert_one(user_msg.dict())

    try:
        chat_inst = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=req.session_id,
            system_message=SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat_inst.send_message(UserMessage(text=req.message))
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

    assistant_msg = ChatMessage(session_id=req.session_id, role="assistant", content=reply)
    await db.chat_messages.insert_one(assistant_msg.dict())

    return ChatResponse(
        session_id=req.session_id,
        reply=reply,
        created_at=assistant_msg.created_at,
    )


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    docs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"session_id": session_id, "messages": docs}


@api_router.delete("/chat/history/{session_id}")
async def clear_history(session_id: str):
    result = await db.chat_messages.delete_many({"session_id": session_id})
    return {"deleted": result.deleted_count}


@api_router.get("/chat/suggestions")
async def chat_suggestions():
    return {
        "suggestions": [
            {"id": "s1", "label": "What should I eat?", "icon": "utensils"},
            {"id": "s2", "label": "Outfit check", "icon": "shirt"},
            {"id": "s3", "label": "Best route home", "icon": "map"},
            {"id": "s4", "label": "Quick workout idea", "icon": "dumbbell"},
            {"id": "s5", "label": "Plan my evening", "icon": "moon"},
            {"id": "s6", "label": "Split this bill", "icon": "divide"},
        ]
    }


@api_router.get("/")
async def root():
    return {"message": "Flow API is live", "tagline": "Life, but easier."}


# ------------------ Utility: reset demo data ------------------

@api_router.delete("/profile/reset")
async def reset_all(user_id: str = DEFAULT_USER):
    await db.priorities.delete_many({"user_id": user_id})
    await db.expenses.delete_many({"user_id": user_id})
    await db.habits.delete_many({"user_id": user_id})
    await db.ai_cache.delete_many({"user_id": user_id})
    await db.profiles.delete_one({"user_id": user_id})
    return {"reset": True}


# ------------------ App wiring ------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
