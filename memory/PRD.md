# Flow — Life, but easier.

## Overview
Flow is an AI-powered Daily Life OS mobile app. **All data is real and user-owned** — no mocks anywhere. Minimal black-and-white aesthetic, dark-mode-first.

## Tech Stack
- **Frontend**: React Native Expo SDK 54, Expo Router, Reanimated 4, expo-linear-gradient, expo-location, Ionicons
- **Backend**: FastAPI + Motor (async MongoDB)
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via Emergent Universal LLM Key
- **Weather**: Open-Meteo (no API key needed), Nominatim reverse geocode
- **Storage**: MongoDB (`profiles`, `priorities`, `expenses`, `habits`, `ai_cache`, `chat_messages`)

## Real Data Pipeline
- **Weather**: device geolocation → Open-Meteo → live temp, condition, high/low, rain %
- **Outfit & Quote**: Claude generates both from real weather each morning; cached per user per day
- **Priorities / Expenses**: full CRUD, user-created, stored per-user in MongoDB
- **Habits**: water glasses + focused minutes + self-reported energy (1–5) logged via quick taps
- **Flow Dashboard** & **Evening Recap**: computed server-side from real data + AI insights

## Screens
1. **Onboarding** — first-run name entry, animated orb, privacy promise
2. **Home / Morning Brief** — real weather+city, AI outfit, editable priorities with empty state, AI daily quote, one-tap habit actions
3. **Flow Dashboard** — 5 interactive bento cards (Time / Money / Health / Connections / Energy). Tap actions log data instantly.
4. **Decide (FAB)** — multi-turn Claude chat with suggestion chips, persisted history
5. **Wind-Down** — recap, stat tiles, spending breakdown with inline add/delete, AI insights, tomorrow preview
6. **Settings** — name edit, privacy-first toggles, reset all data (returns to onboarding)

## Key APIs (all /api prefix)
- `GET /weather?lat=&lon=` — live weather + city label
- `POST /brief/morning` (optional body `{lat, lon}`) — real weather + AI outfit + AI quote + priorities
- `GET /brief/evening` — computed recap
- `GET /flow/dashboard` — computed cards
- `GET/POST /priorities`, `PUT/DELETE /priorities/{id}`
- `GET/POST /expenses`, `DELETE /expenses/{id}`
- `GET /habits`, `POST /habits/water`, `POST /habits/water/decrement`, `POST /habits/focus`, `PUT /habits/energy`
- `GET/PUT /profile`, `DELETE /profile/reset`
- `POST /chat`, `GET /chat/history/{sid}`, `DELETE /chat/history/{sid}`, `GET /chat/suggestions`

## QoL Additions
- Toast feedback on every action ("+1 glass", "Priority added")
- Pull-to-refresh on all data screens
- Tab re-focus auto-refreshes via `useFocusEffect`
- Empty states with helpful prompts
- Edit / delete (long-press) for priorities
- Inline expense list with delete
- Onboarding with privacy reassurance
- Reset All Data for clean restart

## Freemium Hook
"Flow Pro" banner on Flow Dashboard with "Try free" CTA — UI ready, monetization pending.

## Testing
- **24/24 backend pytest tests pass** (Open-Meteo, Claude AI, CRUD, cache, reset)
- Full Playwright E2E verified — onboarding, CRUD flows, AI interactions all working
