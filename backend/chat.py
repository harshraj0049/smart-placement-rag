import logging
import time
from typing import Any, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from langchain_google_genai.chat_models import GoogleAPIError
from pydantic import BaseModel, Field, field_validator

from backend.auth import get_current_user
from backend.rag_service import get_chat_retriever
from rag.query import MissingGenerativeApiKeyError, query_with_sources


router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        content = value.strip()
        if not content:
            raise ValueError("Chat messages cannot be empty.")
        return content


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=10)

    @field_validator("question")
    @classmethod
    def clean_question(cls, value: str) -> str:
        question = value.strip()
        if not question:
            raise ValueError("Enter a question.")
        return question


def _require_student(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can use the placement assistant.",
        )
    return user


def _get_retriever(college_id: str):
    started = time.perf_counter()
    retriever = get_chat_retriever(college_id)
    logger.info("Chat retriever ready in %.2fs", time.perf_counter() - started)
    return retriever


@router.post("/query")
def ask_question(
    request: ChatRequest,
    user: dict[str, Any] = Depends(_require_student),
) -> dict[str, Any]:
    history = [message.model_dump() for message in request.history[-10:]]
    request_started = time.perf_counter()
    try:
        retriever = _get_retriever(str(user["college_id"]))
        result = query_with_sources(request.question, retriever, history)
    except MissingGenerativeApiKeyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.TimeoutException as exc:
        logger.warning("Chat generation timed out while waiting for the AI provider")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI service timed out. Please try again in a moment.",
        ) from exc
    except GoogleAPIError as exc:
        provider_timed_out = exc.code == status.HTTP_504_GATEWAY_TIMEOUT
        logger.warning("Chat generation failed at the AI provider (HTTP %s)", exc.code)
        raise HTTPException(
            status_code=(
                status.HTTP_504_GATEWAY_TIMEOUT
                if provider_timed_out
                else status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "The AI service timed out. Please try again in a moment."
                if provider_timed_out
                else "The AI service is temporarily unavailable. Please try again."
            ),
        ) from exc
    finally:
        logger.info("Chat request completed in %.2fs", time.perf_counter() - request_started)
    return result
