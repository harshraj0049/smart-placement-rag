"""Phase 3 + 4: run the baseline (unfiltered hybrid) and the router on the same typed eval set.

Usage (from the repo root):
    python -m evaluation.compare                    # routing + retrieval + answers for both systems
    python -m evaluation.compare --no-answers       # routing + retrieval only (cheap: 1 LLM call/question)
    python -m evaluation.compare --types company_rules multi_company
    python -m evaluation.compare --grade evaluation/compare_YYYYmmdd_HHMMSS.json   # after manual grading

Scored automatically per question type:
    route_ok        router picked the gold type
    companies_ok    resolved companies == gold companies (types that name companies)
    recall          fraction of must_contain snippets present in the retrieved chunks
    purity          fraction of retrieved notice chunks that belong to the gold companies
    refused         answer says it has no information (compare with expect_refusal)
Scored by you in the JSON: "correct" and "hallucinated" for each system's answer.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import time
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from evaluation.eval_set import CASES
from rag.answer import FALLBACK, generate_answer
from rag.router import Evidence, RouteResult

REFUSAL_PATTERNS = ("don't have that information", "do not have that information",
                    "don't have any recruitment notice", "only help with kiit placement")
NAMES_COMPANIES = {"company", "company_rules", "multi_company"}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower())


def evidence_recall(case, docs):
    snips = case["must_contain"]
    if not snips:
        return None
    texts = [_norm(d.page_content) for d in docs]
    return sum(any(_norm(s) in t for t in texts) for s in snips) / len(snips)


def purity(case, docs):
    if case["type"] not in NAMES_COMPANIES or not case["companies"]:
        return None
    notice = [d.metadata.get("company") for d in docs if d.metadata.get("doc_type") == "company_notice"]
    if not notice:
        return 0.0
    return sum(c in case["companies"] for c in notice) / len(notice)


def refused(answer: str) -> bool:
    a = answer.lower()
    return any(p in a for p in REFUSAL_PATTERNS)


def run(rag, cases, with_answers=True, sleep=0.0):
    rows = []
    for i, case in enumerate(cases, 1):
        q = case["question"]
        print(f"[{i:02d}/{len(cases)}] {case['id']} {case['type']:14} {q[:60]}")

        # ---- baseline: unfiltered hybrid, same k, same answer model
        t0 = time.perf_counter()
        base_docs = rag.retriever.search_all(q)
        base_route = RouteResult(q, None, evidence=[Evidence("Retrieved context", base_docs)])
        base_answer = generate_answer(base_route, rag.answer_llm)[0] if with_answers else None
        base_lat = time.perf_counter() - t0

        # ---- router
        t0 = time.perf_counter()
        route = rag.router.run(q)
        docs = [d for e in route.evidence for d in e.docs]
        answer = generate_answer(route, rag.answer_llm)[0] if with_answers else (route.message or None)
        lat = time.perf_counter() - t0

        resolved = sorted(set(route.resolved.values()))
        row = {
            "id": case["id"], "type": case["type"], "question": q,
            "gold_companies": case["companies"], "expect_refusal": case.get("expect_refusal", False),
            "router": {
                "pred_type": route.query_type,
                "route_ok": route.query_type == case["type"],
                "companies_written": route.decision.companies if route.decision else [],
                "companies_resolved": resolved,
                "did_you_mean": route.message if route.suggestions else None,   # stopped to ask: check the name
                "companies_ok": (resolved == sorted(case["companies"])) if case["type"] in NAMES_COMPANIES else None,
                "evidence": [{"label": e.label, "chunks": [d.metadata.get("chunk_id") for d in e.docs]}
                             for e in route.evidence],
                "recall": evidence_recall(case, docs),
                "purity": purity(case, docs),
                "answer": answer,
                "refused": refused(answer) if answer else route.message is not None,
                "latency_s": round(lat, 2),
                "correct": None, "hallucinated": None, "notes": "",
            },
            "baseline": {
                "chunks": [d.metadata.get("chunk_id") for d in base_docs],
                "recall": evidence_recall(case, base_docs),
                "purity": purity(case, base_docs),
                "answer": base_answer,
                "refused": refused(base_answer) if base_answer else None,
                "latency_s": round(base_lat, 2),
                "correct": None, "hallucinated": None, "notes": "",
            },
        }
        rows.append(row)
        if sleep:
            time.sleep(sleep)
    return rows


def _mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 2) if xs else None


def report(rows) -> str:
    types = sorted({r["type"] for r in rows}, key=lambda t: list(dict.fromkeys(c["type"] for c in CASES)).index(t))
    lines = ["", "Per question type (baseline -> router)", "",
             f"{'type':15} {'n':>3}  {'route ok':>8}  {'cos ok':>6}  {'recall':>13}  {'purity':>13}  {'refusal ok':>13}"]
    for t in types + ["ALL"]:
        rs = rows if t == "ALL" else [r for r in rows if r["type"] == t]
        route_ok = _mean([float(r["router"]["route_ok"]) for r in rs])
        cos_ok = _mean([float(r["router"]["companies_ok"]) for r in rs if r["router"]["companies_ok"] is not None])
        rec = f"{_mean([r['baseline']['recall'] for r in rs])} -> {_mean([r['router']['recall'] for r in rs])}"
        pur = f"{_mean([r['baseline']['purity'] for r in rs])} -> {_mean([r['router']['purity'] for r in rs])}"
        ref_rows = [r for r in rs if r["expect_refusal"]]
        if ref_rows and ref_rows[0]["baseline"]["refused"] is not None:
            ref = (f"{sum(bool(r['baseline']['refused']) for r in ref_rows)}/{len(ref_rows)} -> "
                   f"{sum(bool(r['router']['refused']) for r in ref_rows)}/{len(ref_rows)}")
        else:
            ref = "-"
        lines.append(f"{t:15} {len(rs):>3}  {str(route_ok):>8}  {str(cos_ok):>6}  {rec:>13}  {pur:>13}  {ref:>13}")

    conf = Counter((r["type"], r["router"]["pred_type"]) for r in rows if not r["router"]["route_ok"])
    if conf:
        lines += ["", "Routing mistakes (gold -> predicted): " +
                  ", ".join(f"{g}->{p} x{n}" for (g, p), n in conf.most_common())]
    lat_b = [r["baseline"]["latency_s"] for r in rows]
    lat_r = [r["router"]["latency_s"] for r in rows]
    lines += ["", f"latency median: baseline {statistics.median(lat_b):.2f}s, router {statistics.median(lat_r):.2f}s"]
    return "\n".join(lines)


def grade(path: str) -> None:
    """After filling 'correct' (true/false) for each answer in the JSON, print accuracy per type."""
    rows = json.loads(Path(path).read_text())["rows"]
    by = defaultdict(lambda: {"baseline": [0, 0], "router": [0, 0]})
    for r in rows:
        for sysname in ("baseline", "router"):
            c = r[sysname]["correct"]
            if c is not None:
                by[r["type"]][sysname][0] += bool(c)
                by[r["type"]][sysname][1] += 1
    print(f"\n{'type':15} {'baseline':>12} {'router':>12}")
    tot = {"baseline": [0, 0], "router": [0, 0]}
    for t, s in by.items():
        cells = []
        for sysname in ("baseline", "router"):
            ok, n = s[sysname]
            tot[sysname][0] += ok
            tot[sysname][1] += n
            cells.append(f"{ok}/{n}" if n else "-")
        print(f"{t:15} {cells[0]:>12} {cells[1]:>12}")
    print(f"{'ALL':15} {tot['baseline'][0]}/{tot['baseline'][1]:<9} {tot['router'][0]}/{tot['router'][1]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-answers", action="store_true", help="skip answer generation (routing + retrieval only)")
    ap.add_argument("--types", nargs="*", help="only run these question types")
    ap.add_argument("--ids", nargs="*", help="only run these case ids")
    ap.add_argument("--sleep", type=float, default=0.0, help="seconds between questions (free-tier rate limits)")
    ap.add_argument("--grade", help="print accuracy from a manually graded results file")
    args = ap.parse_args()

    if args.grade:
        grade(args.grade)
        return

    cases = CASES
    if args.types:
        cases = [c for c in cases if c["type"] in args.types]
    if args.ids:
        cases = [c for c in cases if c["id"] in args.ids]

    from rag.pipeline import PlacementRAG
    rag = PlacementRAG.from_env()
    rows = run(rag, cases, with_answers=not args.no_answers, sleep=args.sleep)

    out = Path("evaluation") / f"compare_{datetime.now():%Y%m%d_%H%M%S}.json"
    out.write_text(json.dumps({"created": datetime.now().isoformat(), "n": len(rows), "rows": rows},
                              indent=2, ensure_ascii=False))
    print(report(rows))
    print(f"\nSaved {out}. Grade answers by setting \"correct\" / \"hallucinated\", then run --grade {out}")


if __name__ == "__main__":
    main()
