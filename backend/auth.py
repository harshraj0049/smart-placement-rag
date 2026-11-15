import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

from fastapi import Header, HTTPException, status


DEMO_USERS = {
    "rohan.sharma@kiit.ac.in": {
        "id": "s1",
        "name": "Rohan Sharma",
        "email": "rohan.sharma@kiit.ac.in",
        "password": "student123",
        "role": "student",
        "college_id": "kiit",
        "college_name": "KIIT University",
    },
    "tnp@kiit.ac.in": {
        "id": "a1",
        "name": "Kavita Singh",
        "email": "tnp@kiit.ac.in",
        "password": "admin123",
        "role": "admin",
        "college_id": "kiit",
        "college_name": "KIIT University",
    },
}

TOKEN_TTL_SECONDS = 60 * 60
_signing_secret = os.getenv("AUTH_SECRET") or secrets.token_urlsafe(32)


def _encode_segment(value: dict[str, Any]) -> str:
    data = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _decode_segment(value: str) -> dict[str, Any]:
    padding = "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode(value + padding)
    result = json.loads(decoded)
    if not isinstance(result, dict):
        raise ValueError("JWT segment must be an object")
    return result


def create_access_token(user: dict[str, Any], now: int | None = None) -> str:
    issued_at = int(time.time()) if now is None else now
    header = _encode_segment({"alg": "HS256", "typ": "JWT"})
    payload = _encode_segment({
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "college_id": user["college_id"],
        "college_name": user["college_name"],
        "iat": issued_at,
        "exp": issued_at + TOKEN_TTL_SECONDS,
    })
    message = f"{header}.{payload}".encode("ascii")
    signature = hmac.new(_signing_secret.encode("utf-8"), message, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{header}.{payload}.{encoded_signature}"


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized()

    token = authorization.removeprefix("Bearer ")
    try:
        header, payload, encoded_signature = token.split(".")
        claims = _decode_segment(payload)
        signature = base64.urlsafe_b64decode(encoded_signature + "=" * (-len(encoded_signature) % 4))
        message = f"{header}.{payload}".encode("ascii")
        expected = hmac.new(_signing_secret.encode("utf-8"), message, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        if _decode_segment(header).get("alg") != "HS256":
            raise ValueError("Unsupported algorithm")
        if not isinstance(claims.get("exp"), int) or claims["exp"] <= int(time.time()):
            raise ValueError("Expired token")

        user = DEMO_USERS.get(str(claims.get("email", "")).lower())
        if not user or claims.get("sub") != user["id"] or claims.get("role") != user["role"]:
            raise ValueError("Unknown user")
        return user
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        raise _unauthorized() from None
