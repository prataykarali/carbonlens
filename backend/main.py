import os
import threading
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scraper import scrape_articles, scrape_image
from usage import update_usage_state


USAGE_FILE = Path(os.getenv("CARBONLENS_USAGE_FILE", "/tmp/carbonlens_usage.json"))
usage_lock = threading.Lock()


class UsageEvent(BaseModel):
    anonymous_id: str = Field(..., min_length=8, max_length=140)
    event_type: str = Field("visit", max_length=20)
    total_kg: float = Field(0, ge=0, le=100000)


def allowed_cors_origins() -> list[str]:
    configured = os.getenv("CARBONLENS_ALLOWED_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    return [
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
    ]


app = FastAPI(title="CarbonLens API", version="1.0.0")


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
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


@app.post("/api/usage-event")
def usage_event(event: UsageEvent):
    payload = event.model_dump() if hasattr(event, "model_dump") else event.dict()
    return update_usage_state(payload, USAGE_FILE, usage_lock)
