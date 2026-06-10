import os
import json
import hashlib
import threading
from datetime import date
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scraper import scrape_articles, scrape_image


ROOT = Path(__file__).resolve().parents[1]
USAGE_FILE = Path(os.getenv("CARBONLENS_USAGE_FILE", "/tmp/carbonlens_usage.json"))
usage_lock = threading.Lock()


class UsageEvent(BaseModel):
    anonymous_id: str = Field(..., min_length=8, max_length=140)
    event_type: str = Field("visit", max_length=20)
    total_kg: float = 0


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


def load_usage_state() -> dict:
    if not USAGE_FILE.exists():
        return {"users": [], "days": {}}

    try:
        state = json.loads(USAGE_FILE.read_text())
        return {
            "users": state.get("users", []),
            "days": state.get("days", {}),
        }
    except (OSError, json.JSONDecodeError):
        return {"users": [], "days": {}}


def save_usage_state(state: dict) -> None:
    USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    USAGE_FILE.write_text(json.dumps(state))


def summarize_usage(state: dict) -> dict:
    days = []
    for date_key, row in sorted(state.get("days", {}).items())[-14:]:
        days.append({
            "date": date_key,
            "visits": row.get("visits", 0),
            "entries": row.get("entries", 0),
            "scans": row.get("scans", 0),
            "routes": row.get("routes", 0),
            "diets": row.get("diets", 0),
            "total_kg": round(row.get("total_kg", 0), 2),
            "unique_users": len(row.get("users", [])),
        })

    return {
        "unique_users": len(state.get("users", [])),
        "days": days,
        "privacy": "Stores hashed random browser IDs, event counts, dates, and CO2e totals only.",
    }


def update_usage(event: UsageEvent) -> dict:
    allowed_events = {"visit", "scans", "routes", "diets"}
    event_type = event.event_type if event.event_type in allowed_events else "scans"
    today = date.today().isoformat()
    user_hash = hashlib.sha256(event.anonymous_id.encode("utf-8")).hexdigest()[:32]
    total_kg = max(0, float(event.total_kg or 0))

    with usage_lock:
        state = load_usage_state()
        users = set(state.get("users", []))
        users.add(user_hash)
        state["users"] = sorted(users)

        day = state.setdefault("days", {}).setdefault(today, {
            "visits": 0,
            "entries": 0,
            "scans": 0,
            "routes": 0,
            "diets": 0,
            "total_kg": 0,
            "users": [],
        })
        day_users = set(day.get("users", []))
        day_users.add(user_hash)
        day["users"] = sorted(day_users)

        if event_type == "visit":
            day["visits"] = day.get("visits", 0) + 1
        else:
            day["entries"] = day.get("entries", 0) + 1
            day[event_type] = day.get(event_type, 0) + 1
            day["total_kg"] = round(day.get("total_kg", 0) + total_kg, 2)

        save_usage_state(state)
        return summarize_usage(state)


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


@app.post("/api/usage-event")
def usage_event(event: UsageEvent):
    return update_usage(event)
