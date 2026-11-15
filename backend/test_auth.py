import unittest

from fastapi.testclient import TestClient

from backend.auth import DEMO_USERS, TOKEN_TTL_SECONDS, create_access_token
from backend.main import app


class AuthApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_student_can_log_in_and_read_profile(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "ROHAN.SHARMA@KIIT.AC.IN", "password": "student123"},
        )

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["user"]["role"], "student")
        profile = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {result['access_token']}"},
        )
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()["user"]["email"], "rohan.sharma@kiit.ac.in")

    def test_admin_can_log_in(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "tnp@kiit.ac.in", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["role"], "admin")

    def test_invalid_password_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "tnp@kiit.ac.in", "password": "wrong"},
        )
        self.assertEqual(response.status_code, 401)

    def test_profile_requires_a_valid_token(self) -> None:
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.assertEqual(
            self.client.get(
                "/api/auth/me",
                headers={"Authorization": "Bearer not.a.jwt"},
            ).status_code,
            401,
        )

    def test_expired_token_is_rejected(self) -> None:
        user = DEMO_USERS["rohan.sharma@kiit.ac.in"]
        token = create_access_token(user, now=1 - TOKEN_TTL_SECONDS)
        response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
