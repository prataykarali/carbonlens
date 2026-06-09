import os
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from scraper import scrape_articles, scrape_image


ROOT = Path(__file__).resolve().parents[1]


def read_env_value(name: str) -> str:
    if os.getenv(name):
        return os.getenv(name, "")

    for env_file in (ROOT / ".env.local", ROOT / ".env"):
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == name:
                return value.strip().strip('"').strip("'")

    return ""


app = FastAPI(title="CarbonLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "maps_stack": "leaflet-openstreetmap-osrm-nominatim",
    }


@app.get("/api/food-image")
def food_image(query: str = Query(..., min_length=2, max_length=80)):
    return {"query": query, "image_url": scrape_image(query)}


@app.get("/api/articles")
def articles():
    return {"articles": scrape_articles()}
