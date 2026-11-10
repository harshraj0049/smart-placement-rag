"""Offline stand-ins so tests run without downloading models or calling Gemini."""
import hashlib, math, re

DIM = 384


class FakeEmbeddings:
    """Deterministic bag-of-words hashing embedding. Behaves like a crude keyword matcher."""
    def _vec(self, text):
        v = [0.0] * DIM
        for tok in re.findall(r"[a-z0-9]+", text.lower()):
            v[int(hashlib.md5(tok.encode()).hexdigest(), 16) % DIM] += 1.0
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / n for x in v]

    def embed_documents(self, texts):
        return [self._vec(t) for t in texts]

    def embed_query(self, text):
        return self._vec(text)
