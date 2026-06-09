import json
import re
import time
from html import unescape
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urlencode, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
}

IMAGE_FALLBACKS = {
    "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
    "samosa": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    "banana": "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80",
    "coffee": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    "rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
    "dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80",
    "idli": "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80",
    "dal": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80",
    "chana": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    "oats": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80",
    "biryani": "https://images.unsplash.com/photo-1633945274309-2c16c9682a8b?auto=format&fit=crop&w=900&q=80",
}

ARTICLE_FALLBACKS = [
    {
        "title": "Carbon-smart shopping starts with the highest-impact swap",
        "description": "A practical guide to reducing food and transport emissions without turning daily life into homework.",
        "source": "CarbonLens brief",
        "url": "https://ourworldindata.org/environmental-impacts-of-food",
    },
    {
        "title": "Cities are redesigning short trips around cleaner choices",
        "description": "Transit, walking, and route planning can turn invisible carbon into a decision users understand.",
        "source": "CarbonLens brief",
        "url": "https://ourworldindata.org/co2-emissions-from-transport",
    },
    {
        "title": "Why household energy feedback works best when it is concrete",
        "description": "Comparisons beat abstract kilograms because they map emissions onto familiar physical experiences.",
        "source": "CarbonLens brief",
        "url": "https://ourworldindata.org/energy",
    },
]

_cache: dict[str, tuple[float, Any]] = {}
TTL_SECONDS = 60 * 20


def _cached(key: str):
    hit = _cache.get(key)
    if not hit:
        return None
    created, value = hit
    if time.time() - created > TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return value


def _store(key: str, value: Any):
    _cache[key] = (time.time(), value)
    return value


def _fetch(url: str) -> str:
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=8) as response:
        return response.read().decode("utf-8", errors="replace")


def _clean_url(url: str) -> str:
    url = unescape(url)
    if url.startswith("//duckduckgo.com/l/"):
        parsed = urlparse(f"https:{url}")
        target = parse_qs(parsed.query).get("uddg", [""])[0]
        if target:
            return unquote(target)
    if url.startswith("//"):
        return f"https:{url}"
    return url


def _fallback_image(query: str) -> str:
    lowered = query.lower()
    for key, value in IMAGE_FALLBACKS.items():
        if key in lowered:
            return value
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80"


def scrape_image(query: str) -> str:
    key = f"image:{query.lower().strip()}"
    if cached := _cached(key):
        return cached

    try:
        page = _fetch(f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images")
        vqd = re.search(r"vqd=['\"]([^'\"]+)", page)
        if not vqd:
            raise ValueError("DuckDuckGo image token missing")

        params = urlencode({"l": "us-en", "o": "json", "q": query, "vqd": vqd.group(1), "f": ",,,", "p": "1"})
        payload = _fetch(f"https://duckduckgo.com/i.js?{params}")
        results = json.loads(payload).get("results", [])
        for result in results:
            image = result.get("image") or result.get("thumbnail")
            if image and image.startswith("http"):
                return _store(key, image)
    except Exception:
        pass

    return _store(key, _fallback_image(query))


def scrape_articles() -> list[dict[str, str]]:
    key = "articles:climate-carbon-green-lifestyle"
    if cached := _cached(key):
        return cached

    try:
        rss = _fetch(
            "https://news.google.com/rss/search?q=climate+carbon+sustainability+OR+green+lifestyle&hl=en-IN&gl=IN&ceid=IN:en"
        )
        root = ElementTree.fromstring(rss)
        articles: list[dict[str, str]] = []

        for item in root.findall("./channel/item")[:8]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            description = re.sub(r"<.*?>", "", item.findtext("description") or "").strip()
            source = (item.findtext("source") or "Google News").strip()
            if not title or not link:
                continue
            articles.append(
                {
                    "title": title,
                    "description": description or "Latest sustainability reporting and practical context.",
                    "source": source,
                    "url": link,
                }
            )

        if articles:
            return _store(key, articles)
    except Exception:
        pass

    try:
        html = _fetch("https://duckduckgo.com/html/?q=latest+climate+carbon+green+lifestyle+news")
        blocks = re.findall(r'<div class="result results_links.*?</div>\s*</div>', html, re.S)
        articles: list[dict[str, str]] = []

        for block in blocks[:8]:
            title_match = re.search(r'class="result__a"[^>]*>(.*?)</a>', block, re.S)
            url_match = re.search(r'class="result__a" href="([^"]+)"', block)
            desc_match = re.search(r'class="result__snippet"[^>]*>(.*?)</a>', block, re.S)
            source_match = re.search(r'class="result__url"[^>]*>(.*?)</a>', block, re.S)
            if not title_match:
                continue

            clean = lambda value: re.sub(r"<.*?>", "", unescape(value)).strip()
            articles.append(
                {
                    "title": clean(title_match.group(1)),
                    "description": clean(desc_match.group(1)) if desc_match else "Latest sustainability reporting and practical context.",
                    "source": clean(source_match.group(1)) if source_match else "DuckDuckGo",
                    "url": _clean_url(url_match.group(1)) if url_match else "https://duckduckgo.com/",
                }
            )

        if articles:
            return _store(key, articles)
    except Exception:
        pass

    return _store(key, ARTICLE_FALLBACKS)
