"""Phase 4: query router.

One LLM call with structured output classifies the question and extracts the company
names the student wrote. Plain Python then runs the matching filtered searches
(PlacementRetriever) and returns labelled evidence for the answer step.

Routes
  rules          T&P rules only                         -> search_rules
  company        one named company                      -> search_company
  company_rules  named company/offer + a T&P rule        -> search_company (each) + search_rules
  multi_company  compares 2+ named companies            -> search_company per company
  cross_company  "which companies ..." over ALL notices -> search_notices, wider k (best effort;
                 the exact answer needs the Phase 5 extraction table, not built yet)
  out_of_scope   anything else                          -> no search
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Literal, Optional

from langchain_core.documents import Document
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from rag.companies import CompanyNormalizer, load_aliases
from rag.retrieval import PlacementRetriever

QueryType = Literal["rules", "company", "company_rules", "multi_company", "cross_company", "out_of_scope"]


class RouteDecision(BaseModel):
    """How to answer a student's placement question."""
    reasoning: str = Field(description="One short sentence: why this question type.")
    query_type: QueryType = Field(description="The question type, from the definitions in the prompt.")
    companies: list[str] = Field(
        default_factory=list,
        description="Company names exactly as the student wrote them. Empty if none are named.")
    company_query: str = Field(
        default="",
        description="What to look up in the company notices, as a short search query WITHOUT company names. Empty if not needed.")
    rules_query: str = Field(
        default="",
        description="What to look up in the T&P rules, as a short search query. Empty if not needed.")

    @field_validator("companies")
    @classmethod
    def _clean(cls, v):
        out, seen = [], set()
        for c in (x.strip() for x in v):
            if c and c.lower() not in seen:
                seen.add(c.lower())
                out.append(c)
        return out

    @model_validator(mode="after")
    def _consistent(self):
        n, t = len(self.companies), self.query_type
        if t == "company" and n != 1:
            raise ValueError(f"company needs exactly 1 company, got {n}")
        if t == "company_rules" and n < 1:
            raise ValueError("company_rules needs at least 1 company")
        if t == "multi_company" and n < 2:
            raise ValueError(f"multi_company needs 2+ companies, got {n}")
        if t == "rules" and n:
            raise ValueError("rules questions must not name companies")
        return self


ROUTER_PROMPT = """You route questions for KIIT University's placement assistant.
There are two kinds of documents: the T&P rules (placement categories and CTC slabs, offer limits,
attendance, discipline, absenteeism, PPO and internship rules, off-campus offers), and one recruitment
notice per company (eligibility, CGPA/percentage cutoffs, branches, stipend, CTC, bond/service agreement,
process, dates, location).

Question types:
- rules: only about T&P rules. No company named. "Can I reject an offer?"
- company: about one named company's notice. "What is Juspay's CTC?"
- company_rules: a T&P rule applied to a named company or to an offer the student holds.
  "I have a 6 LPA offer, can I sit for Juspay?", "If I get placed in Infosys can I still apply to KPIT?"
- multi_company: compares or asks about 2 or more named companies. "Compare Mu Sigma and Tredence CTC"
- cross_company: needs a list, count or ranking over ALL companies, or asks which company matches a
  description. "Which companies need 8 CGPA?", "Which company hires Forward Deployed Engineers?"
- out_of_scope: not about KIIT placements.

Companies with notices: {companies}

Rules:
- Copy company names exactly as the student wrote them, even if they are not in the list above.
  Never replace a name with a different company.
- company_query: what to search in the notices, without company names ("stipend CTC").
- rules_query: what to search in the T&P rules ("category 2 eligibility 1.5 times CTC").

Question: {question}"""


@dataclass
class Evidence:
    label: str                         # e.g. "Juspay notice", "T&P rules"
    docs: list[Document]


@dataclass
class RouteResult:
    question: str
    decision: Optional[RouteDecision]
    resolved: dict[str, str] = field(default_factory=dict)   # written name -> stored company
    evidence: list[Evidence] = field(default_factory=list)
    message: Optional[str] = None      # set when we stop before answering
    notes: list[str] = field(default_factory=list)            # passed to the answer model
    fallback: bool = False             # True when the router failed and we searched everything
    suggestions: list[dict] = field(default_factory=list)     # [{"written": "osfn", "options": ["Osfin.ai"]}]
    suggested_question: Optional[str] = None                  # the question with the suggestion filled in

    @property
    def query_type(self) -> str:
        if self.fallback:
            return "fallback"
        return self.decision.query_type if self.decision else "none"


def make_llm_route_fn(llm, max_tries: int = 2) -> Callable[[str], RouteDecision]:
    """Wrap a LangChain chat model as a route function: prompt -> RouteDecision.

    Uses native structured output; on an invalid decision, retries once with the error.
    """
    structured = llm.with_structured_output(RouteDecision)

    def route(prompt: str) -> RouteDecision:
        last_err = None
        for _ in range(max_tries):
            p = prompt if last_err is None else (
                f"{prompt}\n\nYour previous answer was invalid: {last_err}\nFix it.")
            try:
                out = structured.invoke(p)
                if isinstance(out, dict):
                    out = RouteDecision.model_validate(out)
                if out is None:
                    raise ValueError("model returned no structured output")
                return out
            except (ValidationError, ValueError) as e:
                last_err = str(e).splitlines()[0][:300]
        raise RuntimeError(f"router failed after {max_tries} tries: {last_err}")

    return route


class Router:
    def __init__(self, retriever: PlacementRetriever, route_fn: Callable[[str], RouteDecision],
                 k: int = 4, cross_k: int = 10, aliases: Optional[dict] = None):
        self.retriever = retriever
        self.route_fn = route_fn
        self.k, self.cross_k = k, cross_k
        self._aliases = aliases if aliases is not None else load_aliases()
        self.refresh()

    def refresh(self) -> None:
        """Call after ingestion: reloads the company list and clears the BM25 cache."""
        self.companies = self.retriever.list_companies()
        self.normalizer = CompanyNormalizer(self.companies, self._aliases)
        self.retriever.clear_cache()

    def _resolve(self, names: list[str]) -> tuple[dict[str, str], list[dict], list[str]]:
        """-> (resolved written->stored, suggestions, unknown names).

        Only an exact name (ignoring case and punctuation) or a registered alias is accepted
        silently. A close-but-not-exact name becomes a "Did you mean ...?" suggestion: the
        student either sends the suggested question or rewrites their own; we never guess.
        """
        resolved, suggestions, unknown = {}, [], []
        for n in names:
            m = self.normalizer.normalize(n)
            if m.method in ("exact", "alias"):
                resolved[n] = m.canonical
            elif m.method == "fuzzy":
                suggestions.append({"written": n, "options": [self.normalizer.display(m.canonical)]})
            elif m.method == "ambiguous":
                suggestions.append({"written": n, "options": [self.normalizer.display(c) for c in m.candidates]})
            else:
                unknown.append(n)
        return resolved, suggestions, unknown

    @staticmethod
    def _suggest(question: str, suggestions: list[dict]) -> tuple[str, Optional[str]]:
        """-> (message, suggested question or None)."""
        parts = []
        for s in suggestions:
            opts = " or ".join(f'"{o}"' for o in s["options"])
            parts.append(f'Did you mean {opts} instead of "{s["written"]}"?')
        suggested = question
        for s in suggestions:
            pattern = re.compile(re.escape(s["written"]), re.IGNORECASE)
            if len(s["options"]) != 1 or not pattern.search(suggested):
                return " ".join(parts), None         # can't build one unambiguous rewrite
            suggested = pattern.sub(s["options"][0], suggested, count=1)
        return " ".join(parts), suggested

    def run(self, question: str) -> RouteResult:
        prompt = ROUTER_PROMPT.format(
            companies=", ".join(sorted(self.companies.values())), question=question)
        try:
            d = self.route_fn(prompt)
        except Exception:
            # Router down or invalid twice: answer from an unfiltered search rather than fail.
            return RouteResult(question, None, fallback=True,
                               evidence=[Evidence("All documents", self.retriever.search_all(question))])

        t = d.query_type
        cq = d.company_query or question
        rq = d.rules_query or question

        if t == "out_of_scope":
            return RouteResult(question, d, message=(
                "I can only help with KIIT placement questions: T&P rules and company recruitment notices."))
        if t == "rules":
            return RouteResult(question, d, evidence=[Evidence("T&P rules", self.retriever.search_rules(rq, self.k))])
        if t == "cross_company":
            return RouteResult(question, d, evidence=[
                Evidence("Company notices (best matches across all companies)",
                         self.retriever.search_notices(cq, self.cross_k))])

        resolved, suggestions, unknown = self._resolve(d.companies)
        if suggestions:
            message, suggested = self._suggest(question, suggestions)
            return RouteResult(question, d, resolved, message=message,
                               suggestions=suggestions, suggested_question=suggested)
        notes = [f'There is no recruitment notice for "{n}". Do not state any facts about it '
                 f'beyond what the student said.' for n in unknown]
        if not resolved and t != "company_rules":
            names = ", ".join(f'"{n}"' for n in unknown)
            return RouteResult(question, d, message=f"I don't have any recruitment notice for {names}.")

        evidence = []
        for stored in dict.fromkeys(resolved.values()):          # dedupe, keep order
            evidence.append(Evidence(f"{self.normalizer.display(stored)} notice",
                                     self.retriever.search_company(cq, stored, self.k)))
        if t == "company_rules":
            evidence.append(Evidence("T&P rules", self.retriever.search_rules(rq, self.k)))
        return RouteResult(question, d, resolved, evidence, notes=notes)
