"""Auth flow tests: register (saves the chosen role), login and session restore."""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402


class TestAuthFlow(unittest.TestCase):
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
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.engine.dispose()
        self.tmp.cleanup()

    def test_register_saves_user_and_logs_in(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "newbie",
                "password": "secret1",
                "nickname": "新用户",
                "role": "admin",
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.get_json()["data"]
        self.assertEqual(data["user"]["role"], "admin")
        self.assertIsNotNone(data["token"])

        duplicate = self.client.post(
            "/api/auth/register",
            json={"username": "newbie", "password": "secret1"},
        )
        self.assertEqual(duplicate.status_code, 409)

        login = self.client.post(
            "/api/auth/login",
            json={"username": "newbie", "password": "secret1"},
        )
        self.assertEqual(login.status_code, 200)
        token = login.get_json()["data"]["token"]

        me = self.client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me.status_code, 200)
        me_user = me.get_json()["data"]["user"]
        self.assertEqual(me_user["username"], "newbie")
        self.assertEqual(me_user["role"], "admin")

    def test_login_rejects_bad_credentials(self):
        self.client.post(
            "/api/auth/register",
            json={"username": "newbie", "password": "secret1"},
        )
        bad = self.client.post(
            "/api/auth/login",
            json={"username": "newbie", "password": "wrong"},
        )
        self.assertEqual(bad.status_code, 401)


if __name__ == "__main__":
    unittest.main()
