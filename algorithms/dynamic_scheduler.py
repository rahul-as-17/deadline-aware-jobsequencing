"""
Dynamic Programming Job Scheduling Algorithm
==============================================
Uses a weighted job scheduling DP approach.
Jobs are sorted by deadline, and for each job we decide whether
to include it or skip it, maximizing total net profit.

Time Complexity: O(n^2) with binary search optimization → O(n log n)
"""

from typing import List, Dict
import time
import bisect


def dynamic_schedule(jobs: List[Dict]) -> Dict:
    """
    Dynamic programming approach to job scheduling.
    
    Uses weighted interval scheduling DP where jobs are sorted by
    end time (deadline), and we compute the optimal subset.

    Args:
        jobs: List of job dicts with standard attributes

    Returns:
        Dict with scheduling result
    """
    start_time = time.perf_counter()

    if not jobs:
        return _empty_result(start_time)

    n = len(jobs)
    max_deadline = max(j["deadline"] for j in jobs)

    # Create indexed jobs sorted by effective end time
    indexed_jobs = []
    for j in jobs:
        effective_end = min(j["deadline"], j.get("arrival_time", 0) + j["duration"])
        indexed_jobs.append({
            **j,
            "effective_start": j.get("arrival_time", 0),
            "effective_end": effective_end,
        })

    indexed_jobs.sort(key=lambda j: j["effective_end"])

    # For each job i, find the latest job j that doesn't conflict with i
    end_times = [j["effective_end"] for j in indexed_jobs]

    def find_latest_non_conflicting(i):
        """Binary search for the latest job that ends before job i starts."""
        target_start = indexed_jobs[i]["effective_start"]
        idx = bisect.bisect_right(end_times, target_start - 1, 0, i) - 1
        return idx

    # DP table: dp[i] = max net profit considering jobs 0..i
    dp = [0.0] * (n + 1)
    decisions = [False] * n  # Track whether each job is included

    for i in range(1, n + 1):
        job = indexed_jobs[i - 1]
        profit_include = job["profit"]

        p = find_latest_non_conflicting(i - 1)
        if p >= 0:
            profit_include += dp[p + 1]

        # Option 1: exclude job i
        # Option 2: include job i
        if profit_include > dp[i - 1]:
            dp[i] = profit_include
            decisions[i - 1] = True
        else:
            dp[i] = dp[i - 1]
            decisions[i - 1] = False

    # Backtrack to find selected jobs
    selected_indices = []
    i = n
    while i > 0:
        if decisions[i - 1]:
            selected_indices.append(i - 1)
            p = find_latest_non_conflicting(i - 1)
            i = p + 1
        else:
            i -= 1

    selected_indices.reverse()

    # Build the schedule using the timeline
    timeline = [None] * (max_deadline + 1)
    scheduled_jobs = []
    scheduled_ids = set()
    total_profit = 0.0

    for idx in selected_indices:
        job = indexed_jobs[idx]
        job_id = job["id"]
        deadline = job["deadline"]
        duration = job["duration"]
        arrival = job.get("arrival_time", 0)

        placed = False
        for end_slot in range(min(deadline, max_deadline), arrival + duration - 2, -1):
            start_slot = end_slot - duration + 1
            if start_slot < arrival:
                break
            if all(timeline[s] is None for s in range(start_slot, end_slot + 1)):
                for s in range(start_slot, end_slot + 1):
                    timeline[s] = job_id
                scheduled_jobs.append({
                    "job_id": job_id,
                    "start_time": start_slot,
                    "end_time": end_slot,
                })
                scheduled_ids.add(job_id)
                total_profit += job["profit"]
                placed = True
                break

    missed_jobs = [j["id"] for j in jobs if j["id"] not in scheduled_ids]
    total_penalty = sum(j["penalty"] for j in jobs if j["id"] not in scheduled_ids)

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    used_slots = sum(1 for s in timeline if s is not None)
    utilization = used_slots / max(len(timeline), 1)

    return {
        "algorithm": "dynamic_programming",
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
        "algorithm": "dynamic_programming",
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
