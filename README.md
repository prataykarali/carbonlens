---
title: CarbonLens
sdk: docker
app_port: 7860
pinned: false
---

# CarbonLens

Immersive cinematic carbon tracking. Point. Scan. Feel.

## Run locally

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
npm run backend
```

The frontend reads `VITE_BACKEND_URL=http://127.0.0.1:8001`.

## Hugging Face Space

This repo is ready for a Docker-based Hugging Face Space. Push the project to a Space with `sdk: docker`; the included `Dockerfile` builds the Vite app and serves it on port `7860`.

```bash
npm run build
npm run space
```

The frontend has browser-side fallbacks for food images and articles, so the Space can run without the optional local backend.

## Environment

`.env.local` is used for local secrets and is ignored by Git.

```bash
VITE_GEMINI_API_KEY=...
VITE_GROQ_API_KEY=...
VITE_BACKEND_URL=http://127.0.0.1:8001
GOOGLE_MAPS_API_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
```

Maps are free/open by default:

- Leaflet renders the browser map.
- OpenStreetMap provides the basemap tiles.
- OSRM provides route distance where available.
- Nominatim resolves place names for demo-scale geocoding.

Nominatim has a public usage policy and should be used gently. For production, run your own Nominatim instance or use a hosted OSM-compatible geocoder.

## Built Flows

- Cinematic video landing with local `/vid1.mp4` to `/vid10.mp4` assets
- Receipt upload and webcam capture
- Barcode scanning with `@zxing/browser`
- Open Food Facts barcode enrichment
- Manual natural language input
- Dynamic route planner with Leaflet, OpenStreetMap, OSRM, and Nominatim
- Route inputs for current location, travel date, travelers, budget, congestion strategy, and food stops
- Low-carbon route intelligence with cost estimates, low-traffic windows, free-traffic day mode, and travel meal impact
- Diet swap cards with live `/api/food-image?query=...`
- Daily diet calculator for breakfast, lunch, dinner, snacks, servings, and diet preference
- Sustainability article stream from `/api/articles`
- Weekly Carbon Mirror
- LocalStorage dashboard with Recharts
- Browser-native ambient sober music toggle
- Framer Motion scroll reveals, card hover motion, and progress indicator
- Rive React runtime installed with a graceful CSS lens fallback until a `.riv` file is added

## Backend Endpoints

```text
GET /api/health
GET /api/food-image?query=paneer
GET /api/articles
```

## API Status From Latest Local Check

- Groq: working
- Gemini: reachable but returning quota exceeded
- Backend on `8001`: working
- Maps: free OSM/OSRM stack enabled

## Security Note

Vite exposes `VITE_*` values to the browser bundle. That is fine for a hackathon demo, but production should move Gemini and Groq calls behind the backend.
