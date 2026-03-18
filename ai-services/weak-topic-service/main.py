from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import FastAPI
from pydantic import BaseModel

from service_logic import recommend_weak_topics


class RecommendRequest(BaseModel):
    weak_topics: Dict[str, int]
    top_k: int = 5


app = FastAPI(title="ExamEdge Weak Topic Service", version="1.0.0")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "weak-topic", "model": os.getenv("MODEL_NAME", "")}


@app.post("/recommend/weak-topics")
def recommend(req: RecommendRequest) -> Dict[str, Any]:
    return {"ok": True, "recommendations": recommend_weak_topics(req.weak_topics, req.top_k)}

