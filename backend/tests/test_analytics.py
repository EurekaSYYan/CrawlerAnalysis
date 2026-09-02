"""Smoke tests for the expanded analytics payload."""

import sys
import tempfile
import unittest
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import House, User  # noqa: E402
from routes.analytics import _floor_level, _pearson  # noqa: E402


class TestAnalyticsHelpers(unittest.TestCase):
    def test_pearson_perfect_positive(self):
        self.assertEqual(_pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1.0)

    def test_pearson_needs_samples(self):
        self.assertIsNone(_pearson([1], [2]))

    def test_floor_level_parsing(self):
        self.assertEqual(_floor_level("中楼层/共24层"), "中楼层")
        self.assertEqual(_floor_level("低楼层/共6层"), "低楼层")
        self.assertEqual(_floor_level(None), "其他")


class TestAnalyticsEndpoint(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        db_path = Path(self.tmp.name) / "test.db"

        class TestConfig:
            SECRET_KEY = "test-secret"
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
            SQLALCHEMY_TRACK_MODIFICATIONS = False

        self.app = create_app(TestConfig)
        with self.app.app_context():
            db.create_all()
            user = User(
                username="tester",
                password_hash=generate_password_hash("secret1"),
                role="user",
                nickname="Tester",
            )
            db.session.add(user)
            for index in range(10):
                db.session.add(
                    House(
                        title=f"测试房源{index}",
                        city="上海",
                        district="浦东",
                        community="测试小区",
                        price_total=4_000_000 + index * 100_000,
                        price_per_sqm=40_000 + index * 800,
                        area=100,
                        rooms=3,
                        halls=1,
                        bathrooms=1,
                        floor="中楼层/共24层",
                        followers_count=80 + index * 12,
                        listing_days=index * 5,
                    )
                )
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.engine.dispose()
        self.tmp.cleanup()

    def test_summary_contains_new_dimensions(self):
        client = self.app.test_client()
        login = client.post(
            "/api/auth/login",
            json={"username": "tester", "password": "secret1"},
        )
        token = login.get_json()["data"]["token"]
        response = client.get(
            "/api/analytics/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["data"]
        self.assertEqual(payload["summary"]["total_houses"], 10)
        self.assertEqual(len(payload["attention_scatter"]), 10)
        self.assertEqual(len(payload["area_price_scatter"]), 10)
        self.assertEqual(len(payload["building_types"]) >= 1, True)
        self.assertEqual(len(payload["listing_lifecycle"]), 5)
        self.assertEqual(len(payload["floor_analysis"]), 4)
        self.assertIsNotNone(
            payload["summary"]["correlation_attention_price"]
        )


if __name__ == "__main__":
    unittest.main()
