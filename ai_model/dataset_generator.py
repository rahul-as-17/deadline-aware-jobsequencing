"""
Dataset Generator for AI Training
====================================
Generates thousands of random job combinations, computes
optimal scheduling decisions using brute-force, and saves
the results as labeled training data.

Each training sample consists of:
  Features: [deadline, duration, profit, penalty, arrival_time,
             profit_ratio, urgency, slack_ratio]
  Label:    1 if the job is included in the optimal schedule, 0 otherwise
"""

import random
import csv
import os
import sys
import json
from typing import List, Dict, Tuple

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algorithms.bruteforce_scheduler import bruteforce_schedule


def generate_random_jobs(n_jobs: int, max_deadline: int = 10, seed: int = None) -> List[Dict]:
    """
    Generate a random set of jobs.

    Args:
        n_jobs: Number of jobs to generate
        max_deadline: Maximum possible deadline value
        seed: Random seed for reproducibility

    Returns:
        List of job dicts
    """
    if seed is not None:
        random.seed(seed)

    jobs = []
    for i in range(1, n_jobs + 1):
        duration = random.randint(1, max(1, max_deadline // 2))
        arrival = random.randint(0, max(0, max_deadline - duration))
        deadline = random.randint(arrival + duration, max_deadline + 2)
        profit = round(random.uniform(5.0, 100.0), 2)
        penalty = round(random.uniform(1.0, profit * 0.8), 2)

        jobs.append({
            "id": i,
            "deadline": deadline,
            "duration": duration,
            "profit": profit,
            "penalty": penalty,
            "arrival_time": arrival,
        })
    return jobs


def extract_features(job: Dict, all_jobs: List[Dict]) -> List[float]:
    """
    Extract normalized features from a job for the neural network.

    Features:
        1. deadline (normalized)
        2. duration (normalized)
        3. profit (normalized)
        4. penalty (normalized)
        5. arrival_time (normalized)
        6. profit_to_penalty_ratio
        7. urgency = 1 / (1 + slack)
        8. slack_ratio = slack / max_deadline
        9. density = profit / duration
        10. competition = number of overlapping jobs / total jobs
        11. effective_window = (deadline - arrival) / max_deadline
        12. profit_density_rank = rank of profit/duration among all jobs (0-1)
        13. tight_competitors = count of overlapping jobs with slack <= 2, normalized
        14. relative_profit = profit / mean(all profits)
        15. deadline_pressure = duration / (deadline - arrival)
        16. penalty_risk = penalty / (profit + penalty)
    """
    max_deadline = max(j["deadline"] for j in all_jobs) or 1
    max_duration = max(j["duration"] for j in all_jobs) or 1
    max_profit = max(j["profit"] for j in all_jobs) or 1
    max_penalty = max(j["penalty"] for j in all_jobs) or 1
    max_arrival = max(j.get("arrival_time", 0) for j in all_jobs) or 1

    deadline_norm = job["deadline"] / max_deadline
    duration_norm = job["duration"] / max_duration
    profit_norm = job["profit"] / max_profit
    penalty_norm = job["penalty"] / max_penalty
    arrival_norm = job.get("arrival_time", 0) / max(max_arrival, 1)

    profit_penalty_ratio = job["profit"] / max(job["penalty"], 0.01)
    slack = job["deadline"] - job.get("arrival_time", 0) - job["duration"]
    urgency = 1.0 / (1.0 + max(slack, 0))
    slack_ratio = max(slack, 0) / max(max_deadline, 1)
    density = job["profit"] / max(job["duration"], 1)
    density_norm = density / max(max_profit / max(max_duration, 1), 0.01)

    # Count overlapping jobs
    overlap_count = 0
    job_start = job.get("arrival_time", 0)
    job_end = job["deadline"]
    for other in all_jobs:
        if other["id"] == job["id"]:
            continue
        other_start = other.get("arrival_time", 0)
        other_end = other["deadline"]
        if job_start < other_end and other_start < job_end:
            overlap_count += 1
    competition = overlap_count / max(len(all_jobs) - 1, 1)

    # ── New features (11-16) ──────────────────────────────────
    # 11. Effective scheduling window relative to max deadline
    window = job["deadline"] - job.get("arrival_time", 0)
    effective_window = window / max(max_deadline, 1)

    # 12. Profit density rank (0-1): where this job ranks among all by profit/duration
    densities = sorted(
        [j["profit"] / max(j["duration"], 1) for j in all_jobs], reverse=True
    )
    my_density = job["profit"] / max(job["duration"], 1)
    rank_idx = 0
    for idx, d in enumerate(densities):
        if abs(d - my_density) < 1e-9:
            rank_idx = idx
            break
    profit_density_rank = 1.0 - (rank_idx / max(len(all_jobs) - 1, 1))

    # 13. Tight competitors: overlapping jobs with slack <= 2
    tight_count = 0
    for other in all_jobs:
        if other["id"] == job["id"]:
            continue
        other_start = other.get("arrival_time", 0)
        other_end = other["deadline"]
        if job_start < other_end and other_start < job_end:
            other_slack = other["deadline"] - other.get("arrival_time", 0) - other["duration"]
            if other_slack <= 2:
                tight_count += 1
    tight_competitors = tight_count / max(len(all_jobs) - 1, 1)

    # 14. Relative profit: how valuable compared to the average job
    mean_profit = sum(j["profit"] for j in all_jobs) / max(len(all_jobs), 1)
    relative_profit = min(job["profit"] / max(mean_profit, 0.01), 3.0) / 3.0

    # 15. Deadline pressure: what fraction of the window is consumed by duration
    deadline_pressure = job["duration"] / max(window, 1)

    # 16. Penalty risk: proportional downside if missed
    penalty_risk = job["penalty"] / max(job["profit"] + job["penalty"], 0.01)

    # ── Set-level context features (17-22) ────────────────────
    # 17. Timeline congestion: total duration demand / available timeline capacity
    total_demand = sum(j["duration"] for j in all_jobs)
    timeline_congestion = min(total_demand / max(max_deadline, 1), 3.0) / 3.0

    # 18. Profit percentile: fraction of jobs with lower profit
    profits_sorted = sorted(j["profit"] for j in all_jobs)
    profit_pct = sum(1 for p in profits_sorted if p < job["profit"]) / max(len(all_jobs) - 1, 1)

    # 19. Slack percentile: fraction of jobs with higher slack (lower = tighter = more urgent)
    slacks = [j["deadline"] - j.get("arrival_time", 0) - j["duration"] for j in all_jobs]
    slack_pct = sum(1 for s in slacks if s > slack) / max(len(all_jobs) - 1, 1)

    # 20. Dominance score: fraction of other jobs this job dominates
    #     (dominates = higher profit AND fits within the other's window)
    dom_count = 0
    for other in all_jobs:
        if other["id"] == job["id"]:
            continue
        if job["profit"] > other["profit"] and job["duration"] <= other["duration"]:
            dom_count += 1
    dominance_score = dom_count / max(len(all_jobs) - 1, 1)

    # 21. Net value score: (profit - penalty) normalized by max possible net value
    max_net = max((j["profit"] - j["penalty"]) for j in all_jobs) or 1
    min_net = min((j["profit"] - j["penalty"]) for j in all_jobs)
    net_range = max(max_net - min_net, 0.01)
    net_value = ((job["profit"] - job["penalty"]) - min_net) / net_range

    # 22. Greedy selection signal: would the greedy heuristic pick this job?
    #     Simulates a simple greedy pass by profit/deadline ratio ordering
    greedy_order = sorted(all_jobs, key=lambda j: j["profit"] / max(j["deadline"], 1), reverse=True)
    greedy_rank = next((i for i, j in enumerate(greedy_order) if j["id"] == job["id"]), len(all_jobs))
    # Top-ranked jobs get score near 1.0, bottom get near 0.0
    greedy_signal = 1.0 - (greedy_rank / max(len(all_jobs) - 1, 1))

    return [
        round(deadline_norm, 6),
        round(duration_norm, 6),
        round(profit_norm, 6),
        round(penalty_norm, 6),
        round(arrival_norm, 6),
        round(min(profit_penalty_ratio, 10.0) / 10.0, 6),  # cap and normalize
        round(urgency, 6),
        round(slack_ratio, 6),
        round(min(density_norm, 1.0), 6),
        round(competition, 6),
        round(min(effective_window, 1.0), 6),
        round(profit_density_rank, 6),
        round(tight_competitors, 6),
        round(relative_profit, 6),
        round(min(deadline_pressure, 1.0), 6),
        round(penalty_risk, 6),
        round(timeline_congestion, 6),
        round(profit_pct, 6),
        round(slack_pct, 6),
        round(dominance_score, 6),
        round(net_value, 6),
        round(greedy_signal, 6),
    ]


def generate_training_data(
    n_samples: int = 15000,
    min_jobs: int = 4,
    max_jobs: int = 12,
    max_deadline: int = 15,
    output_dir: str = None,
) -> Tuple[str, int]:
    """
    Generate labeled training data by:
    1. Creating random job sets
    2. Computing optimal schedules via brute-force
    3. Labeling each job as selected (1) or not (0)

    Args:
        n_samples: Number of random job-set instances to generate
        min_jobs: Minimum jobs per instance
        max_jobs: Maximum jobs per instance
        max_deadline: Maximum deadline value
        output_dir: Directory to save output files

    Returns:
        Tuple of (output file path, total training rows)
    """
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "..", "data")

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "training_data.csv")

    headers = [
        "deadline_norm", "duration_norm", "profit_norm", "penalty_norm",
        "arrival_norm", "profit_penalty_ratio", "urgency", "slack_ratio",
        "density_norm", "competition", "effective_window", "profit_density_rank",
        "tight_competitors", "relative_profit", "deadline_pressure", "penalty_risk",
        "timeline_congestion", "profit_pct", "slack_pct", "dominance_score",
        "net_value", "greedy_signal",
        "label"
    ]

    total_rows = 0

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)

        for i in range(n_samples):
            n_jobs = random.randint(min_jobs, max_jobs)
            jobs = generate_random_jobs(n_jobs, max_deadline, seed=None)

            # Get optimal schedule
            result = bruteforce_schedule(jobs, max_jobs=max_jobs)
            scheduled_ids = {s["job_id"] for s in result["scheduled_jobs"]}

            # Create labeled rows
            for job in jobs:
                features = extract_features(job, jobs)
                label = 1 if job["id"] in scheduled_ids else 0
                writer.writerow(features + [label])
                total_rows += 1

            if (i + 1) % 100 == 0:
                print("  Generated %d/%d samples (%d rows)..." % (i + 1, n_samples, total_rows))

    # Also save metadata
    meta_path = os.path.join(output_dir, "dataset_meta.json")
    meta = {
        "n_samples": n_samples,
        "min_jobs": min_jobs,
        "max_jobs": max_jobs,
        "max_deadline": max_deadline,
        "total_rows": total_rows,
        "features": headers[:-1],
        "label": "1=scheduled, 0=missed",
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("\nDataset saved to: %s" % output_path)
    print("Total training rows: %d" % total_rows)
    print("Metadata saved to: %s" % meta_path)

    return output_path, total_rows


if __name__ == "__main__":
    print("=" * 60)
    print("  Generating Training Data for AI Scheduler")
    print("=" * 60)
    generate_training_data(n_samples=5000, min_jobs=4, max_jobs=8, max_deadline=10)
