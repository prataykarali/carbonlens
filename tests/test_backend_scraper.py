import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from scraper import ARTICLE_FALLBACKS, _clean_url, _fallback_image, scrape_articles, scrape_image  # noqa: E402


class ScraperFallbackTest(unittest.TestCase):
    def test_duckduckgo_redirect_url_is_cleaned(self):
        dirty = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fclimate"

        self.assertEqual(_clean_url(dirty), "https://example.com/climate")

    def test_unknown_urls_are_left_safe_and_absolute(self):
        self.assertEqual(_clean_url("//example.com/article"), "https://example.com/article")
        self.assertEqual(_clean_url("https://example.com/article"), "https://example.com/article")

    def test_food_image_fallback_is_deterministic(self):
        self.assertIn("images.unsplash.com", _fallback_image("paneer bowl"))
        self.assertIn("images.unsplash.com", _fallback_image("unknown item"))

    def test_public_scrapers_return_fallbacks_when_fetch_fails(self):
        import scraper

        original_fetch = scraper._fetch
        scraper._cache.clear()
        scraper._fetch = lambda _url: (_ for _ in ()).throw(OSError("network disabled in test"))
        try:
            self.assertIn("images.unsplash.com", scrape_image("banana"))
            self.assertEqual(scrape_articles(), ARTICLE_FALLBACKS)
        finally:
            scraper._fetch = original_fetch
            scraper._cache.clear()


if __name__ == "__main__":
    unittest.main()
