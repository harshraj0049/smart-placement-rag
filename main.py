"""Ask the placement assistant from the terminal.

    python main.py "I have a 6 LPA offer, can I sit for Juspay?"
    python main.py                      # interactive; empty line to quit
    python main.py --debug "..."        # also print the route and the retrieved chunks

Ingest first (once):  python -m rag.ingest_all --reset
"""
import argparse
import json

from rag.pipeline import PlacementRAG


def show(out: dict, debug: bool) -> None:
    r = out["route"]
    resolved = ", ".join(f"{k} -> {v}" for k, v in r["companies_resolved"].items())
    print(f"\n[route: {r['type']}" + (f" | {resolved}" if resolved else "") +
          f" | {out['latency_s']['total']}s]")
    print(out["answer"])
    if out["sources"]:
        print("\nSources:")
        for s in out["sources"]:
            print(f"  - {s}")
    if debug:
        print("\nRoute:", json.dumps(r, indent=2))
        for ev in out["_route"].evidence:
            print(f"\n### {ev.label}")
            for d in ev.docs:
                print(f"  [{d.metadata.get('chunk_id')}] {d.page_content[:160]!r}")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question", nargs="*")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    rag = PlacementRAG.from_env()
    if args.question:
        show(rag.ask(" ".join(args.question)), args.debug)
        return
    while True:
        q = input("Question> ").strip()
        if not q:
            break
        show(rag.ask(q), args.debug)


if __name__ == "__main__":
    main()
