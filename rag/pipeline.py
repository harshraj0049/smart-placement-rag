"""One object the CLI, the evaluation and (later) the FastAPI backend all use.

    rag = PlacementRAG.from_env()          # loads embeddings + Gemini models once
    out = rag.ask("I have a 6 LPA offer, can I sit for Juspay?")
    out["answer"], out["sources"], out["route"]
"""
from __future__ import annotations

import os
import time
from typing import Optional

from dotenv import load_dotenv

from rag.answer import generate_answer
from rag.retrieval import PlacementRetriever
from rag.router import RouteResult, Router, make_llm_route_fn
from rag.vector_store import DEFAULT_PERSIST_DIR, get_vector_store

DEFAULT_ROUTER_MODEL = "google_genai:gemini-3.5-flash-lite"   # small + fast: routing is a classification
DEFAULT_ANSWER_MODEL = "google_genai:gemini-3.5-flash-lite"


def route_summary(r: RouteResult) -> dict:
    d = r.decision
    return {
        "type": r.query_type,
        "companies_written": d.companies if d else [],
        "companies_resolved": r.resolved,
        "company_query": d.company_query if d else "",
        "rules_query": d.rules_query if d else "",
        "reasoning": d.reasoning if d else "",
        "evidence": [{"label": e.label, "chunks": len(e.docs)} for e in r.evidence],
        "stopped": r.message is not None,
        "fallback": r.fallback,
    }


class PlacementRAG:
    def __init__(self, store, router_llm, answer_llm, k: int = 4):
        self.retriever = PlacementRetriever(store, k=k)
        self.router = Router(self.retriever, make_llm_route_fn(router_llm), k=k)
        self.answer_llm = answer_llm

    @classmethod
    def from_env(cls, college_id: str = "kiit", persist_dir: str = DEFAULT_PERSIST_DIR,
                 em=None, k: int = 4) -> "PlacementRAG":
        from langchain.chat_models import init_chat_model
        load_dotenv()
        if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
            os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
        if em is None:
            from rag.embedder import EmbeddingModel
            em = EmbeddingModel()
        store = get_vector_store(em, college_id, persist_dir)
        router_llm = init_chat_model(os.getenv("ROUTER_MODEL", DEFAULT_ROUTER_MODEL), temperature=0)
        answer_llm = init_chat_model(os.getenv("ANSWER_MODEL", DEFAULT_ANSWER_MODEL), temperature=0)
        return cls(store, router_llm, answer_llm, k=k)

    def refresh(self) -> None:
        """Call after ingesting new documents."""
        self.router.refresh()

    def ask(self, question: str) -> dict:
        t0 = time.perf_counter()
        route = self.router.run(question)
        t1 = time.perf_counter()
        answer, sources = generate_answer(route, self.answer_llm)
        t2 = time.perf_counter()
        return {
            "question": question,
            "answer": answer,
            "sources": sources,
            "route": route_summary(route),
            "latency_s": {"route_and_retrieve": round(t1 - t0, 2), "answer": round(t2 - t1, 2),
                          "total": round(t2 - t0, 2)},
            "_route": route,                 # full object (retrieved docs) for evaluation; drop before JSON
        }
