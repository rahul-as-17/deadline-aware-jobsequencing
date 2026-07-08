"""
Performance Analyzer
======================
Comprehensive module for comparing scheduling algorithms across:
  - AI prediction accuracy vs brute-force optimal
  - Greedy vs Optimal profit gap
  - Execution time scaling
  - Scalability with increasing job counts
  - System utilization efficiency
  - Space complexity (peak memory) profiling
  - Large-scale comparison (N > 12, no brute-force)
"""

import os, sys, time, random, tracemalloc
from typing import List, Dict, Tuple
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algorithms.greedy_scheduler import greedy_schedule
from algorithms.bruteforce_scheduler import bruteforce_schedule
from algorithms.dynamic_scheduler import dynamic_schedule
from algorithms.priority_queue_manager import priority_queue_schedule
from ai_model.dataset_generator import generate_random_jobs


def run_all_algorithms(jobs: List[Dict], ai_model=None) -> Dict:
    """Run all available algorithms on the same job set and return results."""
    results = {}
    results["greedy"] = greedy_schedule(jobs)
    results["dynamic"] = dynamic_schedule(jobs)
    results["priority_queue"] = priority_queue_schedule(jobs)
    if len(jobs) <= 12:
        results["bruteforce"] = bruteforce_schedule(jobs)
    if ai_model is not None:
        from ai_model.predictor import ai_schedule
        results["ai_enhanced"] = ai_schedule(jobs, model=ai_model)
    return results


def analyze_accuracy(n_tests: int = 100, n_jobs: int = 6, max_deadline: int = 10, ai_model=None) -> Dict:
    """
    Compare AI predictions against brute-force optimal decisions.
    Measures: precision, recall, F1, exact-match accuracy.
    """
    if ai_model is None:
        return {"error": "AI model not loaded"}

    from ai_model.predictor import ai_schedule

    total_jobs = 0
    correct_predictions = 0
    true_positives = 0
    false_positives = 0
    false_negatives = 0
    exact_matches = 0
    profit_gaps = []

    for i in range(n_tests):
        jobs = generate_random_jobs(min(n_jobs, 10), max_deadline)
        bf_result = bruteforce_schedule(jobs)
        ai_result = ai_schedule(jobs, model=ai_model)

        bf_scheduled = set(s["job_id"] for s in bf_result["scheduled_jobs"])
        ai_scheduled = set(s["job_id"] for s in ai_result["scheduled_jobs"])

        if bf_scheduled == ai_scheduled:
            exact_matches += 1

        for job in jobs:
            jid = job["id"]
            bf_in = jid in bf_scheduled
            ai_in = jid in ai_scheduled
            if bf_in == ai_in:
                correct_predictions += 1
            if ai_in and bf_in:
                true_positives += 1
            elif ai_in and not bf_in:
                false_positives += 1
            elif not ai_in and bf_in:
                false_negatives += 1
            total_jobs += 1

        profit_gaps.append(bf_result["net_profit"] - ai_result["net_profit"])

    precision = true_positives / max(true_positives + false_positives, 1)
    recall = true_positives / max(true_positives + false_negatives, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-9)

    return {
        "total_tests": n_tests,
        "total_jobs_evaluated": total_jobs,
        "job_level_accuracy": round(correct_predictions / max(total_jobs, 1), 4),
        "exact_match_accuracy": round(exact_matches / max(n_tests, 1), 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "avg_profit_gap": round(float(np.mean(profit_gaps)), 2),
        "median_profit_gap": round(float(np.median(profit_gaps)), 2),
        "max_profit_gap": round(float(np.max(profit_gaps)), 2),
    }


def analyze_greedy_vs_optimal(n_tests: int = 100, n_jobs: int = 6, max_deadline: int = 10) -> Dict:
    """Compare greedy heuristic profit against brute-force optimal."""
    ratios = []
    profit_diffs = []
    greedy_wins = 0

    for _ in range(n_tests):
        jobs = generate_random_jobs(min(n_jobs, 10), max_deadline)
        g = greedy_schedule(jobs)
        b = bruteforce_schedule(jobs)
        if b["net_profit"] > 0:
            ratios.append(g["net_profit"] / b["net_profit"])
        profit_diffs.append(b["net_profit"] - g["net_profit"])
        if g["net_profit"] >= b["net_profit"]:
            greedy_wins += 1

    return {
        "total_tests": n_tests,
        "avg_optimality_ratio": round(float(np.mean(ratios)) if ratios else 0, 4),
        "min_optimality_ratio": round(float(np.min(ratios)) if ratios else 0, 4),
        "greedy_equals_optimal_pct": round(greedy_wins / max(n_tests, 1), 4),
        "avg_profit_gap": round(float(np.mean(profit_diffs)), 2),
        "max_profit_gap": round(float(np.max(profit_diffs)), 2),
    }


def analyze_scalability(job_counts: List[int] = None, max_deadline: int = 15, n_trials: int = 5, ai_model=None) -> Dict:
    """
    Measure how execution time scales with increasing job count.
    Returns timing data for each algorithm at each job count.
    """
    if job_counts is None:
        job_counts = [3, 4, 5, 6, 7, 8, 9, 10, 12]

    results = []
    for n in job_counts:
        timings = {"n_jobs": n, "greedy": [], "dynamic": [], "priority_queue": []}
        if n <= 12:
            timings["bruteforce"] = []
        if ai_model is not None:
            timings["ai_enhanced"] = []

        for _ in range(n_trials):
            jobs = generate_random_jobs(n, max_deadline)
            all_res = run_all_algorithms(jobs, ai_model if n <= 12 else None)
            for algo, res in all_res.items():
                if algo in timings:
                    timings[algo].append(res["execution_time_ms"])

        row = {"n_jobs": n}
        for algo in ["greedy", "dynamic", "priority_queue", "bruteforce", "ai_enhanced"]:
            if algo in timings and timings[algo]:
                row[algo + "_avg_ms"] = round(float(np.mean(timings[algo])), 4)
                row[algo + "_max_ms"] = round(float(np.max(timings[algo])), 4)
        results.append(row)

    return {"scalability": results, "n_trials_per_point": n_trials, "max_deadline": max_deadline}


def analyze_utilization(n_tests: int = 50, n_jobs: int = 6, max_deadline: int = 10, ai_model=None) -> Dict:
    """Compare system utilization across algorithms."""
    data = {algo: [] for algo in ["greedy", "dynamic", "priority_queue", "bruteforce", "ai_enhanced"]}

    for _ in range(n_tests):
        jobs = generate_random_jobs(min(n_jobs, 10), max_deadline)
        results = run_all_algorithms(jobs, ai_model)
        for algo, res in results.items():
            if algo in data:
                data[algo].append(res["utilization"])

    summary = {}
    for algo, vals in data.items():
        if vals:
            summary[algo] = {
                "avg_utilization": round(float(np.mean(vals)), 4),
                "min_utilization": round(float(np.min(vals)), 4),
                "max_utilization": round(float(np.max(vals)), 4),
            }
    return {"utilization": summary, "n_tests": n_tests}


def analyze_penalty(n_tests: int = 50, n_jobs: int = 6, max_deadline: int = 10, ai_model=None) -> Dict:
    """Penalty analysis: missed job counts and penalty costs per algorithm."""
    data = {algo: {"penalties": [], "missed_counts": [], "missed_ratios": []}
            for algo in ["greedy", "dynamic", "priority_queue", "bruteforce", "ai_enhanced"]}

    for _ in range(n_tests):
        jobs = generate_random_jobs(min(n_jobs, 10), max_deadline)
        results = run_all_algorithms(jobs, ai_model)
        for algo, res in results.items():
            if algo in data:
                data[algo]["penalties"].append(res["total_penalty"])
                data[algo]["missed_counts"].append(res["jobs_missed"])
                data[algo]["missed_ratios"].append(res["jobs_missed"] / max(len(jobs), 1))

    summary = {}
    for algo, d in data.items():
        if d["penalties"]:
            summary[algo] = {
                "avg_penalty": round(float(np.mean(d["penalties"])), 2),
                "avg_missed_jobs": round(float(np.mean(d["missed_counts"])), 2),
                "avg_miss_rate": round(float(np.mean(d["missed_ratios"])), 4),
                "max_penalty": round(float(np.max(d["penalties"])), 2),
            }
    return {"penalty_analysis": summary, "n_tests": n_tests}


def _measure_space(func, *args, **kwargs) -> int:
    """Measure peak memory (in bytes) of a single function execution using tracemalloc."""
    tracemalloc.start()
    func(*args, **kwargs)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak


def analyze_space_complexity(job_counts: List[int] = None, max_deadline: int = 15, n_trials: int = 3, ai_model=None) -> Dict:
    """
    Measure peak memory usage (space complexity) with increasing job count.
    Uses tracemalloc to capture peak allocation per algorithm invocation.
    """
    if job_counts is None:
        job_counts = [3, 4, 5, 6, 8, 10, 12, 15]

    results = []
    for n in job_counts:
        mem_usage = {"n_jobs": n, "greedy": [], "dynamic": [], "priority_queue": []}
        if n <= 12:
            mem_usage["bruteforce"] = []
        if ai_model is not None:
            mem_usage["ai_enhanced"] = []

        for _ in range(n_trials):
            jobs = generate_random_jobs(n, max_deadline)

            mem_usage["greedy"].append(_measure_space(greedy_schedule, jobs))
            mem_usage["dynamic"].append(_measure_space(dynamic_schedule, jobs))
            mem_usage["priority_queue"].append(_measure_space(priority_queue_schedule, jobs))

            if n <= 12:
                mem_usage["bruteforce"].append(_measure_space(bruteforce_schedule, jobs))

            if ai_model is not None:
                from ai_model.predictor import ai_schedule
                mem_usage["ai_enhanced"].append(_measure_space(ai_schedule, jobs, model=ai_model))

        row = {"n_jobs": n}
        for algo in ["greedy", "dynamic", "priority_queue", "bruteforce", "ai_enhanced"]:
            if algo in mem_usage and mem_usage[algo]:
                row[algo + "_peak_bytes"] = round(float(np.mean(mem_usage[algo])), 2)
        results.append(row)

    return {"space_complexity": results, "n_trials_per_point": n_trials}


def analyze_large_scale(job_counts: List[int] = None, n_trials: int = 3, ai_model=None) -> Dict:
    """
    Compare algorithms at large scale (N up to 500) where brute-force is
    infeasible. Measures execution time AND net profit to demonstrate where
    AI's learned heuristic outperforms simple greedy at scale.
    """
    if job_counts is None:
        job_counts = [10, 25, 50, 100, 200, 500]

    results = []
    algos = ["greedy", "dynamic", "priority_queue"]
    if ai_model is not None:
        algos.append("ai_enhanced")

    for n in job_counts:
        # Scale deadline with job count so the timeline isn't artificially cramped
        max_dl = max(30, n // 2)
        metrics = {algo: {"exec_ms": [], "net_profit": [], "utilization": [], "jobs_scheduled": []}
                   for algo in algos}

        for _ in range(n_trials):
            jobs = generate_random_jobs(n, max_dl)

            g = greedy_schedule(jobs)
            metrics["greedy"]["exec_ms"].append(g["execution_time_ms"])
            metrics["greedy"]["net_profit"].append(g["net_profit"])
            metrics["greedy"]["utilization"].append(g["utilization"])
            metrics["greedy"]["jobs_scheduled"].append(g["jobs_scheduled"])

            d = dynamic_schedule(jobs)
            metrics["dynamic"]["exec_ms"].append(d["execution_time_ms"])
            metrics["dynamic"]["net_profit"].append(d["net_profit"])
            metrics["dynamic"]["utilization"].append(d["utilization"])
            metrics["dynamic"]["jobs_scheduled"].append(d["jobs_scheduled"])

            pq = priority_queue_schedule(jobs)
            metrics["priority_queue"]["exec_ms"].append(pq["execution_time_ms"])
            metrics["priority_queue"]["net_profit"].append(pq["net_profit"])
            metrics["priority_queue"]["utilization"].append(pq["utilization"])
            metrics["priority_queue"]["jobs_scheduled"].append(pq["jobs_scheduled"])

            if ai_model is not None:
                from ai_model.predictor import ai_schedule
                ai = ai_schedule(jobs, model=ai_model)
                metrics["ai_enhanced"]["exec_ms"].append(ai["execution_time_ms"])
                metrics["ai_enhanced"]["net_profit"].append(ai["net_profit"])
                metrics["ai_enhanced"]["utilization"].append(ai["utilization"])
                metrics["ai_enhanced"]["jobs_scheduled"].append(ai["jobs_scheduled"])

        row = {"n_jobs": n}
        for algo in algos:
            m = metrics[algo]
            row[algo + "_avg_ms"] = round(float(np.mean(m["exec_ms"])), 4)
            row[algo + "_avg_profit"] = round(float(np.mean(m["net_profit"])), 2)
            row[algo + "_avg_util"] = round(float(np.mean(m["utilization"])), 4)
            row[algo + "_avg_scheduled"] = round(float(np.mean(m["jobs_scheduled"])), 1)
        results.append(row)

    return {"large_scale": results, "n_trials_per_point": n_trials}


def full_analysis(n_tests: int = 50, n_jobs: int = 6, max_deadline: int = 10, ai_model=None) -> Dict:
    """Run all analyses and return combined results."""
    return {
        "accuracy": analyze_accuracy(n_tests, n_jobs, max_deadline, ai_model) if ai_model else None,
        "greedy_vs_optimal": analyze_greedy_vs_optimal(n_tests, n_jobs, max_deadline),
        "scalability": analyze_scalability(ai_model=ai_model),
        "space_complexity": analyze_space_complexity(ai_model=ai_model),
        "large_scale": analyze_large_scale(ai_model=ai_model),
        "utilization": analyze_utilization(n_tests, n_jobs, max_deadline, ai_model),
        "penalty": analyze_penalty(n_tests, n_jobs, max_deadline, ai_model),
    }
