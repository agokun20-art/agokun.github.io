from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="Flow API")
api_router = APIRouter(prefix="/api")


# ------------------ Models ------------------

class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' | 'assistant'
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    created_at: str


class ProfileModel(BaseModel):
    user_id: str = "default"
    name: str = "Alex"
    greeting_name: str = "Alex"
    family_sharing: bool = False
    ai_training: bool = True
    notifications: bool = True
    voice_enabled: bool = True
    theme: str = "dark"
    pro_member: bool = False


# ------------------ Routes ------------------

@api_router.get("/")
async def root():
    return {"message": "Flow API is live", "tagline": "Life, but easier."}


# -------- Morning Brief --------
@api_router.get("/brief/morning")
async def morning_brief():
    now = datetime.now()
    hour = now.hour
    if hour < 12:
        greeting = "Good morning"
    elif hour < 17:
        greeting = "Good afternoon"
    else:
        greeting = "Good evening"
    return {
        "greeting": greeting,
        "name": "Alex",
        "date": now.strftime("%A, %B %d"),
        "weather": {
            "temp": 68,
            "unit": "F",
            "condition": "Partly Cloudy",
            "high": 74,
            "low": 58,
            "icon": "cloud-sun",
            "summary": "Mild day ahead. A light jacket should do."
        },
        "outfit": {
            "suggestion": "Cream linen shirt · slim charcoal trousers · white sneakers",
            "reason": "68°F and light breeze — stay breathable.",
            "confidence": 0.92
        },
        "priorities": [
            {"id": "p1", "title": "Finish Q2 pitch deck", "time": "10:00 AM", "category": "Work", "done": False},
            {"id": "p2", "title": "Coffee with Maya", "time": "2:30 PM", "category": "Connect", "done": False},
            {"id": "p3", "title": "30-min run before sunset", "time": "6:15 PM", "category": "Health", "done": False}
        ],
        "quote": {
            "text": "Small, steady moves. Today will handle itself.",
            "author": "Flow"
        },
        "quick_actions": [
            {"id": "qa1", "label": "Order coffee", "icon": "coffee"},
            {"id": "qa2", "label": "Book ride", "icon": "car"},
            {"id": "qa3", "label": "Hydrate", "icon": "droplet"},
            {"id": "qa4", "label": "Split bill", "icon": "divide"}
        ]
    }


# -------- Evening Wind-Down --------
@api_router.get("/brief/evening")
async def evening_brief():
    return {
        "date": datetime.now().strftime("%A, %B %d"),
        "summary": "A calm, productive day. You stayed ahead on two priorities.",
        "stats": {
            "steps": 8420,
            "screen_time_hours": 4.2,
            "sleep_last_night_hours": 7.3,
            "focused_minutes": 184
        },
        "spending": {
            "total": 47.80,
            "currency": "USD",
            "breakdown": [
                {"category": "Food", "amount": 22.50},
                {"category": "Transport", "amount": 12.00},
                {"category": "Shopping", "amount": 13.30}
            ]
        },
        "insights": [
            "You slept 42 min more than last Tuesday — keep it up.",
            "Screen time dropped 18% after 9 PM. Nice.",
            "You drank 6 of 8 glasses of water."
        ],
        "tomorrow": {
            "first_event": "Standup · 9:00 AM",
            "weather_hint": "Rain likely · grab an umbrella",
            "suggested_wake": "6:45 AM"
        },
        "reflection_prompt": "What is one small thing that went well today?"
    }


# -------- Flow Dashboard --------
@api_router.get("/flow/dashboard")
async def flow_dashboard():
    return {
        "cards": [
            {
                "id": "time",
                "title": "Time",
                "icon": "clock",
                "value": "4h 12m",
                "label": "focused today",
                "delta": "+22% vs yesterday",
                "positive": True,
                "accent": "#FFFFFF"
            },
            {
                "id": "money",
                "title": "Money",
                "icon": "wallet",
                "value": "$47.80",
                "label": "spent today",
                "delta": "Under budget",
                "positive": True,
                "accent": "#D4D4D4"
            },
            {
                "id": "health",
                "title": "Health",
                "icon": "heart-pulse",
                "value": "8,420",
                "label": "steps · 72 bpm",
                "delta": "On track",
                "positive": True,
                "accent": "#B8B8B8"
            },
            {
                "id": "connections",
                "title": "Connections",
                "icon": "users",
                "value": "3",
                "label": "warm check-ins left",
                "delta": "Text Maya",
                "positive": True,
                "accent": "#9A9A9A"
            },
            {
                "id": "energy",
                "title": "Energy",
                "icon": "battery",
                "value": "78%",
                "label": "daily reserve",
                "delta": "Rest at 9 PM",
                "positive": True,
                "accent": "#7A7A7A"
            }
        ]
    }


# -------- Profile --------
@api_router.get("/profile")
async def get_profile():
    doc = await db.profiles.find_one({"user_id": "default"}, {"_id": 0})
    if not doc:
        profile = ProfileModel()
        await db.profiles.insert_one(profile.dict())
        return profile.dict()
    return doc


@api_router.put("/profile")
async def update_profile(profile: ProfileModel):
    data = profile.dict()
    await db.profiles.update_one(
        {"user_id": "default"},
        {"$set": data},
        upsert=True
    )
    return data


# -------- Chat (AI Decision Engine) --------
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

    # Store user message
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
        created_at=assistant_msg.created_at
    )


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    docs = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"session_id": session_id, "messages": docs}


@api_router.delete("/chat/history/{session_id}")
async def clear_history(session_id: str):
    result = await db.chat_messages.delete_many({"session_id": session_id})
    return {"deleted": result.deleted_count}


# -------- Suggestions --------
@api_router.get("/chat/suggestions")
async def chat_suggestions():
    return {
        "suggestions": [
            {"id": "s1", "label": "What should I eat?", "icon": "utensils"},
            {"id": "s2", "label": "Outfit check", "icon": "shirt"},
            {"id": "s3", "label": "Best route home", "icon": "map"},
            {"id": "s4", "label": "Quick workout idea", "icon": "dumbbell"},
            {"id": "s5", "label": "Plan my evening", "icon": "moon"},
            {"id": "s6", "label": "Split this bill", "icon": "divide"}
        ]
    }


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
