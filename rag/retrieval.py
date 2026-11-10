"""Phase 2: filtered hybrid retrieval.

Every search takes a Chroma `where` filter. The SAME filter is applied to both
sides of the hybrid search:
  * vector side: passed to Chroma as `filter=`
  * BM25 side:   the BM25 index is built only from the chunks that match the filter

Building BM25 over the whole collection (what rag/retriver.py does) lets other
companies' chunks leak into a company-filtered search. That is the bug this
module exists to prevent.
"""
from __future__ import annotations

import json
import re
from typing import Optional

from langchain_chroma import Chroma
from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

RULES = "tnp_rules"
NOTICE = "company_notice"


def tokenize(text: str) -> list[str]:
    """Lowercase word tokens; keeps decimals (8.50, 1.5) and percentages' numbers together.

    LangChain's default BM25 tokenizer is text.split(): case-sensitive, punctuation attached
    ("CGPA:" != "cgpa"). That silently breaks keyword matching.
    """
    return re.findall(r"[a-z0-9]+(?:\.[0-9]+)?", text.lower())


def build_where(**conditions) -> Optional[dict]:
    """Keyword conditions -> a valid Chroma where clause.

    Lists become $in; None values are skipped. Chroma rejects two keys in one dict and
    $and with a single clause, so this handles 0, 1 and many conditions correctly.
    """
    clauses = []
    for key, value in conditions.items():
        if value is None:
            continue
        if isinstance(value, (list, tuple, set)):
            clauses.append({key: {"$in": list(value)}})
        else:
            clauses.append({key: value})
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


class PlacementRetriever:
    """Filtered hybrid search over one college's collection."""

    def __init__(self, store: Chroma, k: int = 4, fetch_k: int = 8,
                 weights: tuple[float, float] = (0.5, 0.5)):
        self.store = store
        self.k = k                    # results returned per search
        self.fetch_k = fetch_k        # candidates fetched per side before fusion
        self.weights = list(weights)
        self._bm25_cache: dict[str, Optional[BM25Retriever]] = {}

    # ---------- core ----------
    def _bm25(self, where: Optional[dict]) -> Optional[BM25Retriever]:
        key = json.dumps(where, sort_keys=True)            # None -> "null" = unfiltered index
        if key not in self._bm25_cache:
            got = self.store.get(where=where, include=["documents", "metadatas"])
            docs = [Document(page_content=t, metadata=m, id=i)
                    for i, t, m in zip(got["ids"], got["documents"], got["metadatas"])]
            self._bm25_cache[key] = (
                BM25Retriever.from_documents(docs, k=self.fetch_k, preprocess_func=tokenize)
                if docs else None
            )
        return self._bm25_cache[key]

    def clear_cache(self) -> None:
        """Call after every ingestion, or BM25 will not see new documents."""
        self._bm25_cache.clear()

    def search(self, query: str, where: Optional[dict] = None, k: Optional[int] = None) -> list[Document]:
        k = k or self.k
        bm25 = self._bm25(where)
        if bm25 is None:                                   # filter matched nothing
            return []
        bm25.k = max(self.fetch_k, k)
        kwargs = {"k": max(self.fetch_k, k)}
        if where is not None:
            kwargs["filter"] = where
        vec = self.store.as_retriever(search_kwargs=kwargs)
        fused = EnsembleRetriever(retrievers=[vec, bm25], weights=self.weights).invoke(query)
        return fused[:k]

    # ---------- the tools the router calls ----------
    def search_rules(self, query: str, k: Optional[int] = None) -> list[Document]:
        return self.search(query, build_where(doc_type=RULES), k)

    def search_company(self, query: str, company: str, k: Optional[int] = None) -> list[Document]:
        """`company` must be the stored (lowercase) value; resolve user wording with CompanyNormalizer first."""
        return self.search(query, build_where(doc_type=NOTICE, company=company), k)

    def search_notices(self, query: str, k: Optional[int] = None) -> list[Document]:
        """All company notices, no company filter (used for open questions across companies)."""
        return self.search(query, build_where(doc_type=NOTICE), k)

    def search_all(self, query: str, k: Optional[int] = None) -> list[Document]:
        """Unfiltered hybrid search: the baseline, and the fallback when routing fails."""
        return self.search(query, None, k)

    def list_companies(self) -> dict[str, str]:
        """Stored company value -> display name, e.g. {'osfin.ai': 'Osfin.ai'}."""
        metas = self.store.get(where={"doc_type": NOTICE}, include=["metadatas"])["metadatas"]
        return {m["company"]: m.get("company_display", m["company"]) for m in metas if "company" in m}
