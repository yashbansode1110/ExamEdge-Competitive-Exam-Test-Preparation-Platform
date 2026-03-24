from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Tuple

import faiss
import numpy as np


class VectorStore:
    def __init__(self, dim: int, index_path: str, meta_path: str) -> None:
        self.dim = dim
        self.index_path = index_path
        self.meta_path = meta_path
        self.index = faiss.IndexFlatIP(dim)
        self.meta: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.meta = json.load(f)

    def _persist(self) -> None:
        os.makedirs(os.path.dirname(self.index_path) or ".", exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.meta, f, ensure_ascii=False)

    def upsert(self, vectors: np.ndarray, metas: List[Dict[str, Any]]) -> int:
        if vectors.ndim != 2 or vectors.shape[1] != self.dim:
            raise ValueError("bad vector shape")
        if len(metas) != vectors.shape[0]:
            raise ValueError("meta length mismatch")
        faiss.normalize_L2(vectors)
        self.index.add(vectors.astype(np.float32))
        self.meta.extend(metas)
        self._persist()
        return vectors.shape[0]

    def search(self, query: np.ndarray, k: int = 5) -> List[Tuple[float, Dict[str, Any]]]:
        if query.ndim == 1:
            query = query.reshape(1, -1)
        faiss.normalize_L2(query)
        scores, idxs = self.index.search(query.astype(np.float32), k)
        out: List[Tuple[float, Dict[str, Any]]] = []
        for score, idx in zip(scores[0].tolist(), idxs[0].tolist()):
            if idx < 0 or idx >= len(self.meta):
                continue
            out.append((float(score), self.meta[idx]))
        return out

