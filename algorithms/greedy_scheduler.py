"""
Greedy Job Scheduling Algorithm
================================
Uses a profit-based greedy heuristic to schedule jobs.
Jobs are sorted by profit/deadline ratio and assigned to the latest
available time slot before their deadline.

Time Complexity: O(n log n) for sorting + O(n * d) for slot assignment
where n = number of jobs, d = max deadline
"""

from typing import List, Dict, Tuple
import time


def greedy_schedule(jobs: List[Dict]) -> Dict:
    """
    Greedy scheduling algorithm that maximizes profit by selecting
    highest-profit jobs first and assigning them to latest available slots.

    Args:
        jobs: List of job dicts with keys:
            - id (int): Unique job identifier
            - deadline (int): Latest time slot by which job must finish
            - duration (int): Time units required to complete the job
            - profit (float): Reward for completing the job on time
            - penalty (float): Cost incurred if the job misses its deadline
            - arrival_time (int): Time at which the job becomes available

    Returns:
        Dict with:
            - scheduled_jobs: List of (job_id, start_time) tuples
            - total_profit: Total profit from scheduled jobs
            - total_penalty: Total penalty from missed jobs
            - net_profit: total_profit - total_penalty
            - missed_jobs: List of job IDs that were not scheduled
            - execution_time_ms: Time taken in milliseconds
            - utilization: Fraction of time slots used
    """
    start_time = time.perf_counter()

    if not jobs:
        return _empty_result(start_time)

    # Sort jobs by profit-to-deadline ratio (descending), then by profit
    sorted_jobs = sorted(
        jobs,
        key=lambda j: (j["profit"] / max(j["deadline"], 1), j["profit"]),
        reverse=True,
    )

    max_deadline = max(j["deadline"] for j in jobs)
    # Timeline: each slot is either None (free) or job_id (occupied)
    timeline = [None] * (max_deadline + 1)

    scheduled_jobs = []
    missed_jobs = []
    total_profit = 0.0
    total_penalty = 0.0

    for job in sorted_jobs:
        job_id = job["id"]
        deadline = job["deadline"]
        duration = job["duration"]
        arrival = job.get("arrival_time", 0)
        profit = job["profit"]
        penalty = job["penalty"]

        # Try to find a contiguous block of free slots ending at or before deadline
        placed = False
        for end_slot in range(min(deadline, max_deadline), arrival + duration - 2, -1):
            start_slot = end_slot - duration + 1
            if start_slot < arrival:
                break
            # Check if all slots in [start_slot, end_slot] are free
            if all(timeline[s] is None for s in range(start_slot, end_slot + 1)):
                for s in range(start_slot, end_slot + 1):
                    timeline[s] = job_id
                scheduled_jobs.append({"job_id": job_id, "start_time": start_slot, "end_time": end_slot})
                total_profit += profit
                placed = True
                break

        if not placed:
            missed_jobs.append(job_id)
            total_penalty += penalty

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    used_slots = sum(1 for s in timeline if s is not None)
    utilization = used_slots / max(len(timeline), 1)

    return {
        "algorithm": "greedy",
        "scheduled_jobs": scheduled_jobs,
        "total_profit": round(total_profit, 2),
        "total_penalty": round(total_penalty, 2),
        "net_profit": round(total_profit - total_penalty, 2),
        "missed_jobs": missed_jobs,
        "execution_time_ms": round(elapsed_ms, 4),
        "utilization": round(utilization, 4),
        "jobs_scheduled": len(scheduled_jobs),
        "jobs_missed": len(missed_jobs),
    }


def _empty_result(start_time: float) -> Dict:
    return {
        "algorithm": "greedy",
        "scheduled_jobs": [],
        "total_profit": 0.0,
        "total_penalty": 0.0,
        "net_profit": 0.0,
        "missed_jobs": [],
        "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 4),
        "utilization": 0.0,
        "jobs_scheduled": 0,
        "jobs_missed": 0,
    }
