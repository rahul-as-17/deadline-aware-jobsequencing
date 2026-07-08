"""
Brute Force / Optimal Job Scheduling Algorithm
=================================================
Evaluates all 2^n subsets of jobs and finds the one with
the highest net profit using greedy slot assignment within
each subset (sorted by deadline).

Time Complexity: O(2^n * n * d) — practical for n <= 20
"""

from itertools import combinations
from typing import List, Dict
import time


def bruteforce_schedule(jobs: List[Dict], max_jobs: int = 20) -> Dict:
    """
    Optimal scheduling via exhaustive subset enumeration.
    For each subset, jobs are sorted by deadline and greedily
    assigned to time slots. The best net profit subset wins.
    """
    start_time = time.perf_counter()

    if not jobs:
        return _empty_result(start_time)

    working_jobs = jobs
    if len(jobs) > max_jobs:
        working_jobs = sorted(jobs, key=lambda j: j["profit"], reverse=True)[:max_jobs]

    max_deadline = max(j["deadline"] for j in jobs)
    all_job_ids = {j["id"] for j in jobs}
    n = len(working_jobs)

    best_net = -float("inf")
    best_schedule = []
    best_missed = list(all_job_ids)

    # Enumerate all 2^n - 1 non-empty subsets via bitmask
    for mask in range(1, 1 << n):
        subset = [working_jobs[i] for i in range(n) if mask & (1 << i)]

        # Upper bound pruning: even if we schedule all, can we beat best?
        max_possible = sum(j["profit"] for j in subset)
        min_penalty = sum(j["penalty"] for j in jobs if j["id"] not in {j2["id"] for j2 in subset})
        if max_possible - min_penalty <= best_net:
            continue

        # Sort subset by deadline for greedy slot fill
        subset_sorted = sorted(subset, key=lambda j: j["deadline"])
        scheduled, profit = _fill_slots(subset_sorted, max_deadline)

        scheduled_ids = {s["job_id"] for s in scheduled}
        missed_ids = all_job_ids - scheduled_ids
        penalty = sum(j["penalty"] for j in jobs if j["id"] in missed_ids)
        net = profit - penalty

        if net > best_net:
            best_net = net
            best_schedule = scheduled
            best_missed = list(missed_ids)

    if best_net == -float("inf"):
        best_net = 0
        total_penalty = sum(j["penalty"] for j in jobs)
    else:
        total_penalty = sum(j["penalty"] for j in jobs if j["id"] in set(best_missed))

    total_profit = best_net + total_penalty
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    used_slots = sum(s["end_time"] - s["start_time"] + 1 for s in best_schedule)
    utilization = used_slots / max(max_deadline + 1, 1)

    return {
        "algorithm": "bruteforce_optimal",
        "scheduled_jobs": best_schedule,
        "total_profit": round(total_profit, 2),
        "total_penalty": round(total_penalty, 2),
        "net_profit": round(best_net, 2),
        "missed_jobs": best_missed,
        "execution_time_ms": round(elapsed_ms, 4),
        "utilization": round(utilization, 4),
        "jobs_scheduled": len(best_schedule),
        "jobs_missed": len(best_missed),
    }


def _fill_slots(sorted_jobs, max_deadline: int):
    """Greedily assign sorted jobs to latest available slots before deadline."""
    timeline = [None] * (max_deadline + 1)
    scheduled = []
    total_profit = 0.0

    for job in sorted_jobs:
        jid = job["id"]
        deadline = job["deadline"]
        duration = job["duration"]
        arrival = job.get("arrival_time", 0)

        for end in range(min(deadline - 1, max_deadline - 1), arrival + duration - 2, -1):
            start = end - duration + 1
            if start < arrival:
                break
            if all(timeline[s] is None for s in range(start, end + 1)):
                for s in range(start, end + 1):
                    timeline[s] = jid
                scheduled.append({"job_id": jid, "start_time": start, "end_time": end})
                total_profit += job["profit"]
                break

    return scheduled, total_profit


def _empty_result(start_time: float) -> Dict:
    return {
        "algorithm": "bruteforce_optimal",
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
