# Flow — Life, but easier. (v1.1)

## Overview
AI-powered Daily Life OS. Every screen uses **real user data** — no mocks. Minimal black-and-white aesthetic. Built to publish on App Store and Google Play.

## Tech Stack
- **Frontend**: React Native Expo SDK 54, Expo Router, Reanimated 4, expo-haptics, expo-location, expo-linear-gradient, Ionicons
- **Backend**: FastAPI + Motor (async MongoDB), requests (Open-Meteo + Nominatim)
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via Emergent Universal LLM Key
- **Weather**: Open-Meteo (keyless) + Nominatim reverse geocode
- **Storage**: MongoDB — `profiles`, `priorities`, `expenses`, `habits`, `ai_cache`, `chat_messages`

## Screens
1. **Onboarding** — name entry, animated orb, privacy promise, "Let's flow" CTA
2. **Home / Morning Brief** — real weather+city, AI-generated outfit + daily quote (cached once/day), editable priorities with inline empty state, one-tap habit logging
3. **Flow Dashboard** — 5 bento cards with live data. **Streak pills** at top. **Start focus** opens Pomodoro-style timer modal
4. **Decide (FAB)** — Claude chat with suggestion chips, persisted history
5. **Wind-Down** — computed recap, stat grid, spending breakdown with inline add/delete, AI insights, tomorrow preview
6. **Settings** — name edit, privacy toggles, Insights & streaks, Export your data (JSON), Contact support, Privacy policy, Terms of service, Reset all data
7. **Insights** (`/insights`) — 7-day water & focus sparklines, streak tiles, average energy, export CTA
8. **Privacy** (`/privacy`) — plain-language 9-section policy
9. **Terms** (`/terms`) — 10-section ToS

## New v1.1 Features
- ⏱️ **Focus Timer Modal** — 220px animated ring, 15/25/45m presets, pause/resume/save
- 🔥 **Streaks tracking** — consecutive goal-met days for water & focus
- 📊 **7-day Insights page** — sparkline charts, streak tiles, averages
- 📤 **Data export (GDPR)** — downloadable JSON of all user data
- ⚖️ **Legal screens** — full Privacy Policy + Terms of Service
- 📳 **Haptics** — on every interaction (iOS/Android native, no-op on web)
- 💀 **Skeleton loaders + AnimatedNumber** component ready for use
- 🎨 **Animated streak pills** on Flow dashboard

## Publish-Ready (App Store & Google Play)
- `app.json` with bundleIdentifier `com.flowapp.daily`, versionCode 3, proper splash & icon
- iOS `NSLocationWhenInUseUsageDescription`, `NSMicrophoneUsageDescription`, `ITSAppUsesNonExemptEncryption: false`
- Android permissions declared: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `RECORD_AUDIO`, `INTERNET`, `VIBRATE`
- Dark userInterfaceStyle, black background, typed routes
- Support email & legal website extras
- Dedicated privacy + terms routes ready to link in App Store submission

## Key APIs (/api prefix)
- `GET /weather?lat=&lon=`
- `POST /brief/morning`, `GET /brief/evening`
- `GET /flow/dashboard`
- `GET/POST /priorities`, `PUT/DELETE /priorities/{id}`
- `GET/POST /expenses`, `DELETE /expenses/{id}`
- `GET /habits`, `POST /habits/water`, `POST /habits/water/decrement`, `POST /habits/focus`, `PUT /habits/energy`
- `GET /habits/history?days=N`, `GET /habits/streaks`
- `GET/PUT /profile`, `DELETE /profile/reset`, `GET /profile/export`
- `POST /chat`, `GET/DELETE /chat/history/{sid}`, `GET /chat/suggestions`

## Testing
- **Backend: 16/16 pytest tests pass** (new streaks/history/export + full regression)
- **Frontend: all flows verified** via Playwright — Focus Timer, streak pills, Insights, Privacy, Terms, Settings navigation, CRUD
