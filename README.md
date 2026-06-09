---
title: CarbonLens
emoji: 📉
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Immersive carbon tracker for food, travel, and CO2e
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

This repo is ready for a Docker-based Hugging Face Space. The included `Dockerfile` builds the Vite app and serves it on port `7860`.

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

- Cinematic landing with local video, image, and Rive assets
- Receipt upload and webcam capture
- Barcode scanning with `@zxing/browser`
- Open Food Facts barcode enrichment
- Manual natural language input
- Dynamic route planner with Leaflet, OpenStreetMap, OSRM, and Nominatim
- Daily diet tracker with local food log storage
- Daily dashboard with individual food reporting and charts
- Sustainability article stream from `/api/articles`
- Weekly Carbon Mirror
- Local soundtrack playback from `public/assets/crown_of_black.mp3`

## Backend Endpoints

```text
GET /api/health
GET /api/food-image?query=paneer
GET /api/articles
```

## Security Note

Vite exposes `VITE_*` values to the browser bundle. That is acceptable for a demo, but production should move Gemini and Groq calls behind the backend.
