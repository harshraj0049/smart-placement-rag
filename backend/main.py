import hmac
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from backend.auth import DEMO_USERS, create_access_token, get_current_user


app = FastAPI(title="PlaceMate Demo API")


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def public_user(user: dict[str, Any]) -> dict[str, str]:
    return {key: user[key] for key in ("id", "name", "email", "role", "college_name")}


@app.post("/api/auth/login")
def login(credentials: LoginRequest) -> dict[str, Any]:
    email = credentials.email.strip().lower()
    user = DEMO_USERS.get(email)
    if not user or not hmac.compare_digest(user["password"], credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }


@app.get("/api/auth/me")
def read_current_user(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": public_user(user)}
