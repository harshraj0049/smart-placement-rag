"""Offline tests for ingestion, filtered retrieval, company matching, router and eval.

Run:  python -m pytest -q tests
No model download and no API key needed: embeddings and LLMs are faked. The real PDFs in data/ are used.
"""
import tempfile

import pytest
from langchain_core.messages import AIMessage

from evaluation.compare import report, run
from evaluation.eval_set import CASES
from rag.answer import generate_answer, message_text
from rag.companies import CompanyNormalizer, load_aliases
from rag.ingest_all import count_by_company, ingest_all
from rag.retrieval import PlacementRetriever, build_where, tokenize
from rag.router import RouteDecision, Router, make_llm_route_fn
from rag.vector_store import get_vector_store
from tests.fakes import FakeEmbeddings


# ---------------------------------------------------------------- fixtures
@pytest.fixture(scope="session")
def store():
    em = FakeEmbeddings()
    d = tempfile.mkdtemp()
    report_ = ingest_all(em, persist_dir=d)
    assert not report_["failed"], report_["failed"]
    s = get_vector_store(em, persist_dir=d)
    s._persist_dir_for_tests = d
    return s


@pytest.fixture(scope="session")
def retriever(store):
    return PlacementRetriever(store, k=4)


@pytest.fixture(scope="session")
def companies(retriever):
    return retriever.list_companies()


def oracle_route_fn(companies):
    """Answers with the gold route from the eval set; company names written as display names."""
    gold = {c["question"]: c for c in CASES}
    extra = {
        "Compare Google and Juspay CTC": RouteDecision(reasoning="t", query_type="multi_company",
                                                      companies=["Google", "Juspay"], company_query="ctc"),
        "I have a 7 LPA TCS offer, can I sit for Juspay?": RouteDecision(
            reasoning="t", query_type="company_rules", companies=["TCS", "Juspay"],
            company_query="ctc", rules_query="category 2 1.5 times ctc"),
        "Tell me about Zen": RouteDecision(reasoning="t", query_type="company", companies=["Zen"]),
    }

    def route(prompt: str) -> RouteDecision:
        q = prompt.rsplit("Question: ", 1)[1]
        if q in extra:
            return extra[q]
        c = gold[q]
        if c["id"] == "C27":
            names = ["Google"]
        elif c["type"] == "cross_company":
            names = []
        else:
            names = [companies[x] for x in c["companies"]]
        return RouteDecision(reasoning="oracle", query_type=c["type"], companies=names,
                             company_query=q, rules_query=q)
    return route


class FakeChat:
    """Chat model stand-in. Returns content as a list of parts, like Gemini does."""
    def __init__(self):
        self.calls = 0

    def invoke(self, messages):
        self.calls += 1
        return AIMessage(content=[{"type": "text", "text": "Answer "}, {"type": "text", "text": "text"}])


# ---------------------------------------------------------------- Phase 1: ingestion
def test_every_file_ingested_once(store):
    counts = count_by_company(FakeEmbeddings(), persist_dir=store._persist_dir_for_tests)
    assert len([k for k in counts if k[0] == "company_notice"]) == 20
    assert ("tnp_rules", "-") in counts
    again = ingest_all(FakeEmbeddings(), persist_dir=store._persist_dir_for_tests)
    assert len(again["skipped"]) == 21 and not again["added"]          # idempotent


def test_chunks_are_clean_utf8(store):
    # the Springworks notice used to fail with "TextEncodeInput must be Union[...]" (lone surrogates)
    for t in store.get(include=["documents"])["documents"]:
        t.encode("utf-8")


def test_chunks_have_metadata_and_header(store):
    got = store.get(where={"company": "juspay"}, include=["documents", "metadatas"])
    assert got["ids"]
    for t, m in zip(got["documents"], got["metadatas"]):
        assert t.startswith("[Company: Juspay")
        assert m["doc_type"] == "company_notice" and m["company_display"] == "Juspay"


# ---------------------------------------------------------------- Phase 2: retrieval
def test_tokenize_and_where():
    assert tokenize("CGPA: 8.50 or above!") == ["cgpa", "8.50", "or", "above"]
    assert build_where() is None
    assert build_where(company="juspay") == {"company": "juspay"}
    assert build_where(doc_type="company_notice", company=["a", "b"]) == \
        {"$and": [{"doc_type": "company_notice"}, {"company": {"$in": ["a", "b"]}}]}


def test_search_company_returns_only_that_company(retriever, companies):
    queries = ["cgpa cutoff eligibility", "stipend ctc", "service agreement bond", "process online test interview"]
    for stored in companies:
        for q in queries:
            docs = retriever.search_company(q, stored)
            assert docs, (stored, q)
            assert {d.metadata["company"] for d in docs} == {stored}, (stored, q)


def test_search_rules_returns_only_rules(retriever):
    for q in ["Can I reject an offer?", "attendance for practicals", "category 2 ctc 1.5 times", "stipend"]:
        docs = retriever.search_rules(q)
        assert docs and {d.metadata["doc_type"] for d in docs} == {"tnp_rules"}


def test_unknown_company_returns_nothing(retriever):
    assert retriever.search_company("ctc", "google") == []


def test_unfiltered_search_leaks_notices_into_rules_questions(retriever):
    """Documents the baseline problem the router fixes (seen in the Nov 6 eval too)."""
    docs = retriever.search_all("What is the attendance requirement for practicals and seminars?")
    assert any(d.metadata["doc_type"] == "company_notice" for d in docs)


# ---------------------------------------------------------------- Phase 2: company names
@pytest.mark.parametrize("typed,expected", [
    ("Mu Sigma", "mu sigma"), ("musigma", "mu sigma"), ("osfin", "osfin.ai"), ("xerox", "lexmark"),
    ("Juspay Technologies", "juspay"), ("Infosys Ltd", "infosys"), ("Gyan Sys", "gyansys"),
    ("springwork", "springworks"), ("Zen data", "zen data shastra"), ("CME", "cme group"),
    ("Google", None), ("AWS", None), ("TCS", None),
])
def test_company_normalizer(companies, typed, expected):
    assert CompanyNormalizer(companies, load_aliases()).normalize(typed).canonical == expected


def test_normalizer_ambiguous_and_number_guard():
    n = CompanyNormalizer({"infosys sp": "Infosys SP", "infosys dse": "Infosys DSE", "zen 3": "Zen 3"})
    m = n.normalize("infosys")
    assert m.canonical is None and m.method == "ambiguous"
    assert n.normalize("zen 4").canonical is None


# ---------------------------------------------------------------- Phase 4: router
def test_route_decision_validation():
    with pytest.raises(Exception):
        RouteDecision(reasoning="x", query_type="company", companies=[])
    with pytest.raises(Exception):
        RouteDecision(reasoning="x", query_type="multi_company", companies=["a"])
    with pytest.raises(Exception):
        RouteDecision(reasoning="x", query_type="rules", companies=["a"])
    with pytest.raises(Exception):
        RouteDecision(reasoning="x", query_type="aggregation", companies=[])
    d = RouteDecision(reasoning="x", query_type="multi_company", companies=["A ", "a", "B"])
    assert d.companies == ["A", "B"]


def test_router_dispatch_per_type(retriever, companies):
    router = Router(retriever, oracle_route_fn(companies))
    by_id = {c["id"]: c for c in CASES}

    r = router.run(by_id["R17"]["question"])                       # rules
    assert [e.label for e in r.evidence] == ["T&P rules"]

    r = router.run(by_id["C03"]["question"])                       # company
    assert [e.label for e in r.evidence] == ["Osfin.ai notice"]
    assert {d.metadata["company"] for d in r.evidence[0].docs} == {"osfin.ai"}

    r = router.run(by_id["X01"]["question"])                       # company_rules
    assert [e.label for e in r.evidence] == ["Juspay notice", "T&P rules"]

    r = router.run(by_id["M04"]["question"])                       # multi_company, 3 companies
    assert [e.label for e in r.evidence] == ["AntBox notice", "Pibit.ai notice", "Zen Data Shastra notice"]

    r = router.run(by_id["C24"]["question"])                       # cross_company: best effort, wide k
    assert len(r.evidence) == 1 and len(r.evidence[0].docs) == 10
    assert {d.metadata["doc_type"] for d in r.evidence[0].docs} == {"company_notice"}

    r = router.run(by_id["O01"]["question"])                       # out of scope
    assert r.message and not r.evidence


def test_router_unknown_company(retriever, companies):
    router = Router(retriever, oracle_route_fn(companies))
    r = router.run([c for c in CASES if c["id"] == "C27"][0]["question"])     # Google only
    assert r.message and "Google" in r.message and not r.evidence

    r = router.run("Compare Google and Juspay CTC")                # one known, one unknown
    assert [e.label for e in r.evidence] == ["Juspay notice"] and any("Google" in n for n in r.notes)

    r = router.run("I have a 7 LPA TCS offer, can I sit for Juspay?")   # existing offer from an unknown company
    assert [e.label for e in r.evidence] == ["Juspay notice", "T&P rules"]


def test_router_falls_back_when_llm_fails(retriever):
    def broken(prompt):
        raise TimeoutError("gemini down")
    r = Router(retriever, broken).run("Can I reject an offer?")
    assert r.fallback and r.query_type == "fallback" and r.evidence[0].docs


def test_llm_route_fn_retries_once_with_error():
    class StructuredFake:
        def __init__(self):
            self.prompts = []

        def invoke(self, prompt):
            self.prompts.append(prompt)
            if len(self.prompts) == 1:
                return {"reasoning": "x", "query_type": "company", "companies": []}     # invalid
            return {"reasoning": "x", "query_type": "company", "companies": ["Juspay"]}

    class LLM:
        def __init__(self):
            self.s = StructuredFake()

        def with_structured_output(self, schema):
            return self.s

    llm = LLM()
    d = make_llm_route_fn(llm)("Question: what is juspay ctc")
    assert d.companies == ["Juspay"]
    assert "previous answer was invalid" in llm.s.prompts[1]


# ---------------------------------------------------------------- answer step
def test_message_text_handles_part_lists():
    assert message_text(AIMessage(content=[{"type": "text", "text": "a"}, {"type": "text", "text": "b"}])) == "ab"
    assert message_text(AIMessage(content="plain")) == "plain"


def test_answer_skips_llm_when_router_stopped(retriever, companies):
    llm = FakeChat()
    router = Router(retriever, oracle_route_fn(companies))
    ans, src = generate_answer(router.run("Who won the IPL this year?"), llm)
    assert llm.calls == 0 and src == []
    ans, src = generate_answer(router.run("Can I reject an offer after being selected?"), llm)
    assert llm.calls == 1 and ans == "Answer text" and src


# ---------------------------------------------------------------- Phase 3: eval harness
def test_compare_runs_and_router_is_pure(retriever, companies):
    class RagStub:
        pass
    rag = RagStub()
    rag.retriever = retriever
    rag.router = Router(retriever, oracle_route_fn(companies))
    rag.answer_llm = FakeChat()
    rows = run(rag, CASES, with_answers=True)
    assert all(r["router"]["route_ok"] for r in rows)                  # oracle router
    for r in rows:
        if r["router"]["purity"] is not None and not r["expect_refusal"]:
            assert r["router"]["purity"] == 1.0, r["id"]
    text = report(rows)
    assert "company_rules" in text and "ALL" in text
