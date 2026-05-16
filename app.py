"""
FastAPI Backend — Intelligent Deadline-Aware Job Scheduling System
====================================================================
Provides REST API endpoints for:
- Running scheduling algorithms (greedy, brute-force, DP, priority queue, AI)
- Comparing algorithm results side by side
- Generating random jobs
- Training/retraining the AI model
- Real-time job insertion simulation
"""

import os, sys, json, time
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from algorithms.greedy_scheduler import greedy_schedule
from algorithms.bruteforce_scheduler import bruteforce_schedule
from algorithms.dynamic_scheduler import dynamic_schedule
from algorithms.priority_queue_manager import priority_queue_schedule
from ai_model.dataset_generator import generate_random_jobs, generate_training_data
from ai_model.predictor import ai_schedule, load_model

# ─── App Setup ───────────────────────────────────────────────
app = FastAPI(
    title="Intelligent Job Scheduler API",
    description="DAA + ML powered deadline-aware job scheduling system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to load AI model at startup
ai_model = None
try:
    ai_model = load_model()
    print("[OK] AI model loaded successfully")
except FileNotFoundError:
    print("[WARN] AI model not found -- run training first. AI endpoints will be unavailable.")


# ─── Pydantic Models ─────────────────────────────────────────
class Job(BaseModel):
    id: int
    deadline: int = Field(ge=1)
    duration: int = Field(ge=1)
    profit: float = Field(gt=0)
    penalty: float = Field(ge=0)
    arrival_time: int = Field(default=0, ge=0)

class JobList(BaseModel):
    jobs: List[Job]

class GenerateRequest(BaseModel):
    n_jobs: int = Field(default=6, ge=1, le=20)
    max_deadline: int = Field(default=10, ge=2, le=50)
    seed: Optional[int] = None

class TrainRequest(BaseModel):
    n_samples: int = Field(default=2000, ge=100, le=10000)
    epochs: int = Field(default=100, ge=10, le=500)
    batch_size: int = Field(default=64, ge=16, le=256)


# ─── API Routes ──────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Intelligent Job Scheduler API", "version": "1.0.0"}


@app.post("/api/generate-jobs")
def generate_jobs(req: GenerateRequest):
    """Generate a random set of jobs."""
    jobs = generate_random_jobs(req.n_jobs, req.max_deadline, req.seed)
    return {"jobs": jobs, "count": len(jobs)}


@app.post("/api/schedule/greedy")
def run_greedy(req: JobList):
    """Run greedy scheduling algorithm."""
    jobs = [j.model_dump() for j in req.jobs]
    return greedy_schedule(jobs)


@app.post("/api/schedule/bruteforce")
def run_bruteforce(req: JobList):
    """Run brute-force optimal scheduling (limited to ≤12 jobs)."""
    jobs = [j.model_dump() for j in req.jobs]
    if len(jobs) > 12:
        raise HTTPException(400, "Brute-force limited to ≤12 jobs for feasibility")
    return bruteforce_schedule(jobs)


@app.post("/api/schedule/dynamic")
def run_dynamic(req: JobList):
    """Run dynamic programming scheduling."""
    jobs = [j.model_dump() for j in req.jobs]
    return dynamic_schedule(jobs)


@app.post("/api/schedule/priority-queue")
def run_priority_queue(req: JobList):
    """Run priority queue scheduling."""
    jobs = [j.model_dump() for j in req.jobs]
    return priority_queue_schedule(jobs)


@app.post("/api/schedule/ai")
def run_ai(req: JobList):
    """Run AI-enhanced scheduling."""
    global ai_model
    if ai_model is None:
        raise HTTPException(503, "AI model not trained yet. POST /api/train first.")
    jobs = [j.model_dump() for j in req.jobs]
    return ai_schedule(jobs, model=ai_model)


@app.post("/api/compare")
def compare_all(req: JobList):
    """Run all algorithms and return comparison results."""
    global ai_model
    jobs = [j.model_dump() for j in req.jobs]
    results = {}

    results["greedy"] = greedy_schedule(jobs)
    results["dynamic"] = dynamic_schedule(jobs)
    results["priority_queue"] = priority_queue_schedule(jobs)

    if len(jobs) <= 12:
        results["bruteforce"] = bruteforce_schedule(jobs)

    if ai_model is not None:
        results["ai_enhanced"] = ai_schedule(jobs, model=ai_model)

    # Build summary comparison
    summary = {}
    for algo, res in results.items():
        summary[algo] = {
            "net_profit": res["net_profit"],
            "total_profit": res["total_profit"],
            "total_penalty": res["total_penalty"],
            "jobs_scheduled": res["jobs_scheduled"],
            "jobs_missed": res["jobs_missed"],
            "execution_time_ms": res["execution_time_ms"],
            "utilization": res["utilization"],
        }

    return {"results": results, "summary": summary, "job_count": len(jobs)}


@app.post("/api/train")
def train_model_endpoint(req: TrainRequest):
    """Generate training data and train the AI model."""
    global ai_model
    from ai_model.train_model import train_model as do_train

    print("Generating training data...")
    data_path, total_rows = generate_training_data(n_samples=req.n_samples)
    print(f"Training model with {total_rows} rows...")
    model_path, history = do_train(data_path=data_path, epochs=req.epochs, batch_size=req.batch_size)

    ai_model = load_model(model_path)
    return {
        "status": "success",
        "model_path": model_path,
        "training_rows": total_rows,
        "final_train_acc": history["train_acc"][-1],
        "final_val_acc": history["val_acc"][-1],
    }


@app.get("/api/model-status")
def model_status():
    """Check if AI model is loaded and ready."""
    model_dir = os.path.join(os.path.dirname(__file__), "ai_model", "saved_models")
    history_path = os.path.join(model_dir, "training_history.json")
    history = None
    if os.path.exists(history_path):
        with open(history_path) as f:
            history = json.load(f)
    return {
        "model_loaded": ai_model is not None,
        "model_path": os.path.join(model_dir, "scheduler_model.pth") if ai_model else None,
        "training_history": history,
    }


# ─── Analysis Endpoints ──────────────────────────────────────

class AnalysisRequest(BaseModel):
    n_tests: int = Field(default=50, ge=5, le=500)
    n_jobs: int = Field(default=6, ge=3, le=12)
    max_deadline: int = Field(default=10, ge=3, le=30)


@app.post("/api/analysis/accuracy")
def run_accuracy_analysis(req: AnalysisRequest):
    """Analyze AI prediction accuracy vs brute-force optimal."""
    from analysis.performance_analyzer import analyze_accuracy
    return analyze_accuracy(req.n_tests, req.n_jobs, req.max_deadline, ai_model)


@app.post("/api/analysis/greedy-vs-optimal")
def run_greedy_vs_optimal(req: AnalysisRequest):
    """Compare greedy heuristic profit against brute-force optimal."""
    from analysis.performance_analyzer import analyze_greedy_vs_optimal
    return analyze_greedy_vs_optimal(req.n_tests, req.n_jobs, req.max_deadline)


@app.post("/api/analysis/scalability")
def run_scalability_analysis(req: AnalysisRequest):
    """Measure execution time scaling with increasing job counts."""
    from analysis.performance_analyzer import analyze_scalability
    return analyze_scalability(ai_model=ai_model)


@app.post("/api/analysis/utilization")
def run_utilization_analysis(req: AnalysisRequest):
    """Compare system utilization across algorithms."""
    from analysis.performance_analyzer import analyze_utilization
    return analyze_utilization(req.n_tests, req.n_jobs, req.max_deadline, ai_model)


@app.post("/api/analysis/penalty")
def run_penalty_analysis(req: AnalysisRequest):
    """Penalty analysis: missed jobs and penalty costs per algorithm."""
    from analysis.performance_analyzer import analyze_penalty
    return analyze_penalty(req.n_tests, req.n_jobs, req.max_deadline, ai_model)


@app.post("/api/analysis/full")
def run_full_analysis(req: AnalysisRequest):
    """Run all performance analyses combined."""
    from analysis.performance_analyzer import full_analysis
    return full_analysis(req.n_tests, req.n_jobs, req.max_deadline, ai_model)


# Mount frontend static files (if built)
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
