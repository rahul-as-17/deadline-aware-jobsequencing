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
    for other in all_jobs:
        if other["id"] == job["id"]:
            continue
        other_start = other.get("arrival_time", 0)
        other_end = other["deadline"]
        job_start = job.get("arrival_time", 0)
        job_end = job["deadline"]
        if job_start < other_end and other_start < job_end:
            overlap_count += 1
    competition = overlap_count / max(len(all_jobs) - 1, 1)

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
    ]


def generate_training_data(
    n_samples: int = 10000,
    min_jobs: int = 4,
    max_jobs: int = 8,
    max_deadline: int = 10,
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
        "density_norm", "competition", "label"
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
    generate_training_data(n_samples=2000, min_jobs=4, max_jobs=8, max_deadline=10)
