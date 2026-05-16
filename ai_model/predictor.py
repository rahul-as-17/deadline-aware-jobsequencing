"""
AI Predictor for Live Scheduling
===================================
Loads a trained model and uses it to predict job priority scores,
then schedules jobs based on predicted priorities.
"""

import os, sys, time
from typing import List, Dict
import torch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ai_model.model import SchedulerNet, SchedulerNetV2
from ai_model.dataset_generator import extract_features


def load_model(model_path: str = None):
    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), "saved_models", "scheduler_model.pth")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Run train_model.py first.")

    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    model_type = checkpoint.get("model_type", "v1")
    input_size = checkpoint.get("input_size", 10)

    model = SchedulerNetV2(input_size) if model_type == "v2" else SchedulerNet(input_size)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model


def predict_priorities(model, jobs: List[Dict]) -> List[float]:
    """Predict scheduling priority scores for each job."""
    if not jobs:
        return []
    features = [extract_features(job, jobs) for job in jobs]
    features_tensor = torch.tensor(features, dtype=torch.float32)
    with torch.no_grad():
        scores = model(features_tensor).squeeze(-1).tolist()
    if isinstance(scores, float):
        scores = [scores]
    return scores


def ai_schedule(jobs: List[Dict], model=None, model_path: str = None) -> Dict:
    """
    AI-enhanced scheduling: uses neural network priority scores
    to order jobs, then greedily assigns them to time slots.
    """
    start_time = time.perf_counter()
    if not jobs:
        return _empty_result(start_time)

    if model is None:
        model = load_model(model_path)

    scores = predict_priorities(model, jobs)
    scored_jobs = list(zip(jobs, scores))
    scored_jobs.sort(key=lambda x: x[1], reverse=True)

    max_deadline = max(j["deadline"] for j in jobs)
    timeline = [None] * (max_deadline + 1)
    scheduled_jobs, scheduled_ids = [], set()
    total_profit = 0.0

    for job, score in scored_jobs:
        jid, dl, dur = job["id"], job["deadline"], job["duration"]
        arrival = job.get("arrival_time", 0)
        for end in range(min(dl, max_deadline), arrival + dur - 2, -1):
            start = end - dur + 1
            if start < arrival:
                break
            if all(timeline[s] is None for s in range(start, end + 1)):
                for s in range(start, end + 1):
                    timeline[s] = jid
                scheduled_jobs.append({"job_id": jid, "start_time": start, "end_time": end, "ai_score": round(score, 4)})
                scheduled_ids.add(jid)
                total_profit += job["profit"]
                break

    missed = [j["id"] for j in jobs if j["id"] not in scheduled_ids]
    total_penalty = sum(j["penalty"] for j in jobs if j["id"] not in scheduled_ids)
    elapsed = (time.perf_counter() - start_time) * 1000
    used = sum(1 for s in timeline if s is not None)

    return {
        "algorithm": "ai_enhanced",
        "scheduled_jobs": scheduled_jobs,
        "total_profit": round(total_profit, 2),
        "total_penalty": round(total_penalty, 2),
        "net_profit": round(total_profit - total_penalty, 2),
        "missed_jobs": missed,
        "execution_time_ms": round(elapsed, 4),
        "utilization": round(used / max(len(timeline), 1), 4),
        "jobs_scheduled": len(scheduled_jobs),
        "jobs_missed": len(missed),
        "ai_scores": {j["id"]: round(s, 4) for j, s in zip(jobs, scores)},
    }


def _empty_result(st):
    return {"algorithm": "ai_enhanced", "scheduled_jobs": [], "total_profit": 0, "total_penalty": 0,
            "net_profit": 0, "missed_jobs": [], "execution_time_ms": round((time.perf_counter()-st)*1000, 4),
            "utilization": 0, "jobs_scheduled": 0, "jobs_missed": 0, "ai_scores": {}}
