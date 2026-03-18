from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

from model_loader import load_model
from service_logic import VectorStore

MODEL_NAME = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
INDEX_PATH = os.getenv("INDEX_PATH", "./data/faiss.index")
META_PATH = os.getenv("META_PATH", "./data/meta.json")

app = FastAPI(title="ExamEdge Doubt Solver Service", version="1.0.0")

model = None
store: Optional[VectorStore] = None


class UpsertItem(BaseModel):
    id: str
    text: str
    meta: Dict[str, Any] = Field(default_factory=dict)


class UpsertRequest(BaseModel):
    items: List[UpsertItem]


class SearchRequest(BaseModel):
    query: str
    k: int = 5


class DoubtRequest(BaseModel):
    question_text: str
    k: int = 5


@app.on_event("startup")
def startup() -> None:
    global model, store
    model = load_model(MODEL_NAME)
    dim = int(model.get_sentence_embedding_dimension())
    store = VectorStore(dim=dim, index_path=INDEX_PATH, meta_path=META_PATH)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "doubt-solver", "model": MODEL_NAME}


@app.post("/index/upsert")
def upsert(req: UpsertRequest) -> Dict[str, Any]:
    assert store is not None
    vecs = model.encode([x.text for x in req.items], convert_to_numpy=True, show_progress_bar=False)
    metas = [{"id": x.id, **x.meta} for x in req.items]
    n = store.upsert(np.array(vecs), metas)
    return {"ok": True, "upserted": n}


@app.post("/index/search")
def search(req: SearchRequest) -> Dict[str, Any]:
    assert store is not None
    q = model.encode([req.query], convert_to_numpy=True, show_progress_bar=False)
    hits = store.search(np.array(q), k=req.k)
    return {"ok": True, "hits": [{"score": s, "meta": m} for (s, m) in hits]}


@app.post("/doubt/solve")
def doubt(req: DoubtRequest) -> Dict[str, Any]:
    assert store is not None
    q = model.encode([req.question_text], convert_to_numpy=True, show_progress_bar=False)
    hits = store.search(np.array(q), k=req.k)
    return {
        "ok": True,
        "strategy": "retrieval",
        "similar": [{"score": s, "meta": m} for (s, m) in hits],
        "next_steps": [
            "Review the most similar questions and their topics.",
            "Attempt a fresh similar question timed.",
            "Mark the concept and add to weak-topic list if incorrect."
        ]
    }

