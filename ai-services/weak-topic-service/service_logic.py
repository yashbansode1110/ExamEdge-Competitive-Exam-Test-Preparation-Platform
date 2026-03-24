from __future__ import annotations

from typing import Dict, List


def recommend_weak_topics(weak_topics: Dict[str, int], top_k: int = 5) -> List[dict]:
    items = sorted(weak_topics.items(), key=lambda kv: (-kv[1], kv[0]))
    return [{"topic": t, "priority": c} for (t, c) in items[:top_k]]

