from __future__ import annotations

import hashlib
import json
import threading
from datetime import date
from pathlib import Path
from typing import Any


ALLOWED_EVENTS = {"visit", "scans", "routes", "diets"}
MAX_TOTAL_KG = 100000
PRIVACY_SUMMARY = "Stores hashed random browser IDs, event counts, dates, and CO2e totals only."


def empty_usage_state() -> dict[str, Any]:
    """Return the default anonymous analytics store shape."""
    return {"users": [], "days": {}}


def hash_anonymous_id(anonymous_id: str) -> str:
    """Hash a random browser ID before it is written to aggregate usage state."""
    return hashlib.sha256(str(anonymous_id).encode("utf-8")).hexdigest()[:32]


def sanitize_event_type(event_type: str) -> str:
    """Restrict arbitrary client event names to the known aggregate counters."""
    return event_type if event_type in ALLOWED_EVENTS else "scans"


def sanitize_total_kg(total_kg: Any) -> float:
    """Clamp reported CO2e totals to a non-negative bounded value."""
    try:
        value = float(total_kg or 0)
    except (TypeError, ValueError):
        value = 0
    return min(MAX_TOTAL_KG, max(0, value))


def load_usage_state(usage_file: Path) -> dict[str, Any]:
    """Read aggregate usage state from disk, falling back to an empty store."""
    if not usage_file.exists():
        return empty_usage_state()

    try:
        state = json.loads(usage_file.read_text())
        return {
            "users": state.get("users", []),
            "days": state.get("days", {}),
        }
    except (OSError, json.JSONDecodeError):
        return empty_usage_state()


def save_usage_state(usage_file: Path, state: dict[str, Any]) -> None:
    """Persist aggregate usage state to disk."""
    usage_file.parent.mkdir(parents=True, exist_ok=True)
    usage_file.write_text(json.dumps(state))


def summarize_usage(state: dict[str, Any]) -> dict[str, Any]:
    """Create the public, privacy-safe usage response."""
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
        "privacy": PRIVACY_SUMMARY,
    }


def update_usage_state(
    event: dict[str, Any],
    usage_file: Path,
    lock: threading.Lock | None = None,
    today: str | None = None,
) -> dict[str, Any]:
    """Update anonymous aggregate usage counters and return the public summary."""
    anonymous_id = str(event.get("anonymous_id", ""))
    if len(anonymous_id) < 8:
        return summarize_usage(load_usage_state(usage_file))

    event_type = sanitize_event_type(str(event.get("event_type", "visit")))
    total_kg = sanitize_total_kg(event.get("total_kg", 0))
    today_key = today or date.today().isoformat()
    user_hash = hash_anonymous_id(anonymous_id)
    state_lock = lock or threading.Lock()

    with state_lock:
        state = load_usage_state(usage_file)
        users = set(state.get("users", []))
        users.add(user_hash)
        state["users"] = sorted(users)

        day = state.setdefault("days", {}).setdefault(today_key, {
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

        save_usage_state(usage_file, state)
        return summarize_usage(state)
