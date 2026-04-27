# Flow — Life, but easier.

## Overview
Flow is an AI-powered Daily Life OS mobile app — a calm, premium companion that handles tiny daily decisions so you can focus on living. Minimal black-and-white aesthetic, dark-mode-first, 10+ opens a day.

## Tech Stack
- **Frontend**: React Native Expo SDK 54, Expo Router, Reanimated 4, expo-linear-gradient, Ionicons
- **Backend**: FastAPI + Motor (async MongoDB)
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via Emergent Universal LLM Key
- **Storage**: MongoDB (`chat_messages`, `profiles`)

## Design System
- **Palette**: Pure black (#000), near-black surface (#0D0D0D), subtle borders (#1F1F1F), monochrome accents (whites through greys)
- **Typography**: System / SF Pro with tight letter-spacing, generous whitespace
- **Motion**: Reanimated staggered `FadeInDown`, pulsing FAB halo

## Screens
1. **Home — Morning Brief** — greeting, weather+outfit glass card, 3 toggleable priorities, quote, one-tap actions, "Ask Flow" CTA
2. **Flow Dashboard** — bento of 5 cards: Time (wide) · Money + Health (split) · Connections (wide) · Energy (progress)
3. **Decide (center FAB)** — real-time AI chat with Claude Sonnet 4.5, 6 suggestion chips, multi-turn persisted history, clear button
4. **Wind-Down** — stats grid (steps/focus/screen/sleep), spending breakdown bars, gentle insights, tomorrow card, reflection prompt
5. **Settings** — avatar, inline name edit, Family Sharing / AI Training / Notifications / Voice toggles (all persisted), theme, language, about

## API (/api prefix)
- `GET /brief/morning`, `GET /brief/evening` — mock daily briefs
- `GET /flow/dashboard` — 5-card monochrome dashboard
- `GET/PUT /profile` — profile with privacy toggles
- `POST /chat`, `GET /chat/history/{sid}`, `DELETE /chat/history/{sid}`, `GET /chat/suggestions` — real AI

## Freemium Hook
"Flow Pro" upgrade banner on Flow Dashboard + "Free plan" badge in profile — UI only, monetization-ready.

## Testing
- 11/11 backend pytest passing (see `/app/backend/tests/backend_test.py`)
- Full Playwright UI pass — all 5 screens, AI chat, priority toggles, profile persistence verified
