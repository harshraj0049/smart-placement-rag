"""Answer step: labelled context from the router -> final answer from the chat model."""
from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from rag.prompts import CROSS_COMPANY_NOTE, MULTI_SOURCE_INSTRUCTIONS, SYSTEM_PROMPT
from rag.router import RouteResult

FALLBACK = "I don't have that information, please contact the T&P cell."


def source_label(doc) -> str:
    m = doc.metadata or {}
    page = m.get("page")
    page = page + 1 if isinstance(page, int) else page        # loader pages are 0-based
    return f"Page {page} — {m.get('document_name') or m.get('source') or 'Unknown document'}"


def format_context(route: RouteResult) -> tuple[str, list[str]]:
    """-> (context string grouped by evidence label, sorted unique source labels)."""
    blocks, sources = [], set()
    for ev in route.evidence:
        parts = []
        for d in ev.docs:
            src = source_label(d)
            sources.add(src)
            parts.append(f"[Source: {src}]\n{d.page_content}")
        body = "\n\n".join(parts) if parts else "(nothing relevant found)"
        blocks.append(f"### {ev.label}\n\n{body}")
    return "\n\n---\n\n".join(blocks), sorted(sources)


def message_text(response) -> str:
    """Plain text from a chat model response.

    Gemini can return content as a list of parts ([{'type': 'text', 'text': ...}, ...]).
    Storing response.content directly is why the Nov 6 eval files hold lists, not strings.
    """
    content = getattr(response, "content", response)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
    return str(content)


def generate_answer(route: RouteResult, llm) -> tuple[str, list[str]]:
    """-> (answer text, sources). Never calls the model when the router stopped early."""
    if route.message:
        return route.message, []
    context, sources = format_context(route)
    if not any(ev.docs for ev in route.evidence):
        return FALLBACK, []

    notes = list(route.notes)
    if route.query_type == "cross_company":
        notes.append(CROSS_COMPANY_NOTE)
    notes_block = ("\nNotes:\n" + "\n".join(f"- {n}" for n in notes) + "\n") if notes else ""

    messages = [
        SystemMessage(content=SYSTEM_PROMPT + MULTI_SOURCE_INSTRUCTIONS),
        HumanMessage(content=(
            f"Retrieved context:\n{context}\n{notes_block}\n"
            f"Student question:\n{route.question}\n\nAnswer using the system instructions.")),
    ]
    return message_text(llm.invoke(messages)).strip(), sources
