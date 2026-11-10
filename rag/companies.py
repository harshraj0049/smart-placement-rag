"""Phase 2: map what a student types ("musigma", "osfin", "xerox") to the stored company value.

Three outcomes, never a silent guess:
  * a confident match           -> canonical = stored value ("mu sigma")
  * ambiguous (two close names) -> canonical = None, candidates listed
  * no match ("Google")         -> canonical = None
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process, utils

REGISTRY = Path("data/notices/registry.json")


@dataclass
class CompanyMatch:
    query: str
    canonical: Optional[str]          # stored lowercase value, or None
    method: str                       # exact | alias | fuzzy | ambiguous | none
    score: float = 0.0
    candidates: tuple = ()


def load_aliases(path: Path = REGISTRY) -> dict[str, list[str]]:
    try:
        return json.loads(Path(path).read_text()).get("aliases", {})
    except FileNotFoundError:
        return {}


class CompanyNormalizer:
    def __init__(self, companies: dict[str, str], aliases: Optional[dict[str, list[str]]] = None,
                 threshold: float = 85, margin: float = 10, min_fuzzy_len: int = 4):
        """companies: stored value -> display name (PlacementRetriever.list_companies())."""
        self.companies = dict(companies)
        self.threshold, self.margin, self.min_fuzzy_len = threshold, margin, min_fuzzy_len
        self._exact: dict[str, str] = {}
        for stored, display in self.companies.items():
            self._exact[utils.default_process(stored)] = stored
            self._exact[utils.default_process(display)] = stored
        for stored, names in (aliases or {}).items():
            if stored in self.companies:                       # ignore aliases for companies not ingested
                for n in names:
                    self._exact[utils.default_process(n)] = stored
        self._choices = list(self.companies)

    @staticmethod
    def _numbers(s: str) -> set[str]:
        return set(re.findall(r"\d+", s))

    def normalize(self, text: str) -> CompanyMatch:
        key = utils.default_process(text)
        if key in self._exact:
            return CompanyMatch(text, self._exact[key], "exact", 100)
        if len(key) < self.min_fuzzy_len or not self._choices:
            return CompanyMatch(text, None, "none")
        top = process.extract(key, self._choices, scorer=fuzz.WRatio,
                              processor=utils.default_process, limit=3)
        # every number the student typed must appear in the candidate
        top = [t for t in top if self._numbers(text) <= self._numbers(t[0])]
        if not top or top[0][1] < self.threshold:
            return CompanyMatch(text, None, "none", top[0][1] if top else 0)
        if len(top) > 1 and top[0][1] - top[1][1] < self.margin:
            return CompanyMatch(text, None, "ambiguous", top[0][1], tuple(t[0] for t in top[:2]))
        return CompanyMatch(text, top[0][0], "fuzzy", top[0][1])

    def display(self, stored: str) -> str:
        return self.companies.get(stored, stored)
