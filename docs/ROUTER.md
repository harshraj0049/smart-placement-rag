# Filtered retrieval and query router (Phases 2–4)

Built on top of `my-new-branch` (Harsh Raj's ingestion work, Nov 6). Phase 5 (structured
extraction table for "which companies..." questions) is **not** included: those questions are
routed to `cross_company` and answered best-effort from the closest notices, with a note that the
list may be incomplete.

## Run it

```bash
pip install -r requirements.txt          # adds rapidfuzz, pytest
python -m rag.ingest_all --reset         # once: rebuild chroma_db with the metadata schema
python main.py "I have a 6 LPA offer, can I sit for Juspay?"
python main.py --debug "Compare Mu Sigma and Tredence CTC"     # also prints route + chunks
python -m pytest -q tests                # 30 offline tests, no API key needed
python -m evaluation.compare --no-answers   # baseline vs router: routing + retrieval only
python -m evaluation.compare --sleep 4      # full run with answers (free tier: keep the sleep)
```

`.env` needs `GEMINI_API_KEY`. Models default to `google_genai:gemini-3.5-flash-lite`;
override with `ROUTER_MODEL` / `ANSWER_MODEL`.

## How a question flows

```
question
  -> Router: 1 Gemini call, structured output RouteDecision
       {query_type, companies (as written), company_query, rules_query}
  -> CompanyNormalizer: written name -> stored company (exact, alias, fuzzy + guards)
  -> PlacementRetriever: filtered hybrid search (Chroma filter + BM25 built on the same subset)
  -> labelled context ("### Juspay notice", "### T&P rules")
  -> answer model with SYSTEM_PROMPT + labelled-source rules
```

| Route | Searches | Example |
|---|---|---|
| rules | T&P rules only | Can I reject an offer? |
| company | that company's notice | What is Juspay's CTC? |
| company_rules | company notice(s) + T&P rules | I have a 6 LPA offer, can I sit for Juspay? |
| multi_company | one search per company | Compare Mu Sigma and Tredence CTC |
| cross_company | all notices, k=10, best effort | Which companies need 8 CGPA? |
| out_of_scope | none, fixed reply | Who won the IPL? |

Early exits: an unknown company ("Google") gets "I don't have any recruitment notice for Google"
and no LLM answer call. An ambiguous name asks which one. If the router call fails twice, the
question falls back to an unfiltered search over everything.

## New files

| File | What |
|---|---|
| `rag/retrieval.py` | `PlacementRetriever`: `search_rules`, `search_company`, `search_notices`, `search_all`, `list_companies`; BM25 cached per filter; proper tokenizer |
| `rag/companies.py` | `CompanyNormalizer` with aliases from `registry.json` |
| `rag/router.py` | `RouteDecision` schema, router prompt, `Router` dispatch, LLM wrapper with one retry |
| `rag/answer.py` | labelled context, answer generation, `message_text` (fixes list-of-parts answers) |
| `rag/prompts.py` | `SYSTEM_PROMPT` (copied from evaluate.py) + labelled-source instructions |
| `rag/pipeline.py` | `PlacementRAG.from_env().ask(question)`: what FastAPI should call |
| `data/notices/registry.json` | filename -> company, notice_type, job_role, date; company aliases |
| `evaluation/eval_set.py` | 76 typed cases: 34 rules, 31 company (from evaluate.py), 6 company+rules, 4 multi-company, 1 out of scope |
| `evaluation/compare.py` | baseline vs router, per-type report, manual grading helper |
| `tests/` | offline tests with fake embeddings and fake LLMs |

## Changes to existing files (please review, Harsh Raj)

| File | Change | Why |
|---|---|---|
| `rag/ingest.py` | moved `job_role` into `DocumentMetadata` and its cleaning validator; added `persist_dir` arg | the field was pasted inside `NoticeType`, so `meta.job_role` crashed at runtime |
| `rag/ingest_all.py` | rewritten: uses `ingest_document` + `registry.json`, writes `ingest_report.json`, `--reset` | it imported `ingest_pdf_documents`, which no longer exists |
| `rag/loader.py` | `clean_text` re-pairs UTF-16 surrogates; debug prints removed | Springworks failed with "TextEncodeInput must be Union[...]" because of emoji split into lone surrogates |
| `rag/vector_store.py` | optional `persist_dir` on both functions | lets tests use a temp store; default unchanged |
| `main.py` | now a CLI over `PlacementRAG` | old main imported functions that no longer exist |

`rag/query.py`, `rag/retriver.py` and `evaluation/evaluate.py` are untouched.

## What is verified and what is not

Verified offline (fake embeddings, fake LLMs, the real PDFs): all 21 PDFs ingest, re-ingest is
idempotent, every company-filtered search returns only that company for 20 companies x 4 queries,
rules search returns only rules, all dispatch paths and early exits, retry and fallback, the eval
harness. The Gemini structured-output schema was built against `langchain-google-genai` 4.4.3
(flat object, inline enum) but no live Gemini call was made: run `evaluation.compare` for real numbers.

With a perfect (oracle) router and crude keyword embeddings, evidence recall went 0.47 -> 0.92 on
company+rules questions and 0.50 -> 1.00 on multi-company; wrong-company chunks dropped to zero.
That is an upper bound, not the real result.
