import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from usage import hash_anonymous_id, sanitize_event_type, sanitize_total_kg, update_usage_state  # noqa: E402


class UsageAggregationTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(prefix="carbonlens-test-")
        self.usage_file = Path(self.temp_dir.name) / "usage.json"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_visit_tracks_unique_browser_without_personal_data(self):
        summary = update_usage_state(
            {"anonymous_id": "browser-123456", "event_type": "visit"},
            self.usage_file,
            today="2026-06-10",
        )
        raw_state = json.loads(self.usage_file.read_text())

        self.assertEqual(summary["unique_users"], 1)
        self.assertEqual(summary["days"][-1]["visits"], 1)
        self.assertIn("hashed random browser IDs", summary["privacy"])
        self.assertNotIn("browser-123456", raw_state["users"])
        self.assertIn(hash_anonymous_id("browser-123456"), raw_state["users"])

    def test_unknown_event_falls_back_to_scan_entry(self):
        summary = update_usage_state(
            {"anonymous_id": "browser-abcdef", "event_type": "unknown", "total_kg": 2.5},
            self.usage_file,
            today="2026-06-10",
        )

        self.assertEqual(summary["days"][-1]["entries"], 1)
        self.assertEqual(summary["days"][-1]["scans"], 1)
        self.assertEqual(summary["days"][-1]["total_kg"], 2.5)

    def test_invalid_total_is_clamped(self):
        self.assertEqual(sanitize_total_kg("-2"), 0)
        self.assertEqual(sanitize_total_kg("not-a-number"), 0)
        self.assertEqual(sanitize_total_kg(200000), 100000)

    def test_invalid_anonymous_id_does_not_write_personal_data(self):
        summary = update_usage_state(
            {"anonymous_id": "short", "event_type": "routes", "total_kg": 5},
            self.usage_file,
            today="2026-06-10",
        )

        self.assertEqual(summary["unique_users"], 0)
        self.assertEqual(summary["days"], [])
        self.assertFalse(self.usage_file.exists())

    def test_event_type_is_restricted_to_known_counters(self):
        self.assertEqual(sanitize_event_type("routes"), "routes")
        self.assertEqual(sanitize_event_type("<script>"), "scans")


if __name__ == "__main__":
    unittest.main()
