"""
Priority Queue Manager for Real-Time Job Scheduling
=====================================================
Manages a priority queue of jobs for real-time insertion
and scheduling. Supports dynamic job arrivals and
urgency-based prioritization.

Uses a max-heap (via negation) to efficiently extract
the highest-priority job.
"""

import heapq
from typing import List, Dict, Optional, Tuple
import time


class PriorityQueueManager:
    """
    A priority queue that orders jobs by a composite priority score.
    
    Priority Score = w1 * (profit / max_profit) 
                   + w2 * (1 / slack_time) 
                   + w3 * (penalty / max_penalty)

    where slack_time = deadline - current_time - duration
    """

    def __init__(self, w_profit: float = 0.4, w_urgency: float = 0.35, w_penalty: float = 0.25):
        """
        Initialize the priority queue manager.

        Args:
            w_profit: Weight for profit factor
            w_urgency: Weight for urgency factor (inverse slack time)
            w_penalty: Weight for penalty factor
        """
        self._heap: List[Tuple[float, int, Dict]] = []  # (neg_priority, counter, job)
        self._counter = 0
        self.w_profit = w_profit
        self.w_urgency = w_urgency
        self.w_penalty = w_penalty
        self._max_profit = 1.0
        self._max_penalty = 1.0
        self._removed = set()  # Track removed job IDs

    def add_job(self, job: Dict, current_time: int = 0) -> float:
        """
        Add a job to the priority queue.

        Args:
            job: Job dict with standard attributes
            current_time: Current simulation time

        Returns:
            The computed priority score for the job
        """
        self._max_profit = max(self._max_profit, job["profit"])
        self._max_penalty = max(self._max_penalty, job["penalty"])

        priority = self._compute_priority(job, current_time)
        self._counter += 1
        heapq.heappush(self._heap, (-priority, self._counter, job))
        return priority

    def pop_job(self) -> Optional[Dict]:
        """
        Remove and return the highest-priority job.

        Returns:
            Job dict, or None if queue is empty
        """
        while self._heap:
            neg_priority, counter, job = heapq.heappop(self._heap)
            if job["id"] not in self._removed:
                return job
        return None

    def peek(self) -> Optional[Dict]:
        """Return the highest-priority job without removing it."""
        while self._heap:
            neg_priority, counter, job = self._heap[0]
            if job["id"] not in self._removed:
                return job
            heapq.heappop(self._heap)
        return None

    def remove_job(self, job_id: int):
        """Mark a job as removed (lazy deletion)."""
        self._removed.add(job_id)

    def update_priorities(self, current_time: int):
        """
        Recompute priorities for all jobs based on new current_time.
        This is useful when time advances and urgency changes.
        """
        old_jobs = []
        while self._heap:
            _, _, job = heapq.heappop(self._heap)
            if job["id"] not in self._removed:
                old_jobs.append(job)

        self._counter = 0
        for job in old_jobs:
            priority = self._compute_priority(job, current_time)
            self._counter += 1
            heapq.heappush(self._heap, (-priority, self._counter, job))

    def _compute_priority(self, job: Dict, current_time: int) -> float:
        """Compute the composite priority score for a job."""
        profit_score = job["profit"] / max(self._max_profit, 1e-6)

        slack = job["deadline"] - current_time - job["duration"]
        if slack <= 0:
            urgency_score = 1.0  # Maximum urgency (about to miss deadline)
        else:
            urgency_score = 1.0 / (1.0 + slack)

        penalty_score = job["penalty"] / max(self._max_penalty, 1e-6)

        return (
            self.w_profit * profit_score
            + self.w_urgency * urgency_score
            + self.w_penalty * penalty_score
        )

    def size(self) -> int:
        """Return number of non-removed jobs in the queue."""
        return sum(1 for _, _, j in self._heap if j["id"] not in self._removed)

    def is_empty(self) -> bool:
        """Check if the queue has no valid jobs."""
        return self.size() == 0

    def get_all_jobs(self) -> List[Dict]:
        """Return all non-removed jobs sorted by priority (highest first)."""
        result = []
        for neg_p, _, job in sorted(self._heap):
            if job["id"] not in self._removed:
                result.append(job)
        return result


def priority_queue_schedule(jobs: List[Dict], start_time: int = 0, locked_timeline: List = None) -> Dict:
    """
    Schedule jobs using the priority queue manager.
    Simulates time progression and picks the highest-priority job
    at each time step.

    Args:
        jobs: List of job dicts
        start_time: Time tick to start scheduling decisions from
        locked_timeline: Optional pre-existing timeline slots to preserve

    Returns:
        Scheduling result dict
    """
    start_perf = time.perf_counter()

    if not jobs:
        if locked_timeline:
            # Reconstruct result based on locked timeline
            scheduled_jobs = []
            scheduled_ids = set()
            n_slots = len(locked_timeline)
            i = 0
            while i < n_slots:
                jid = locked_timeline[i]
                if jid is not None:
                    s = i
                    while i < n_slots and locked_timeline[i] == jid:
                        i += 1
                    e = i - 1
                    scheduled_jobs.append({"job_id": jid, "start_time": s, "end_time": e})
                    scheduled_ids.add(jid)
                else:
                    i += 1
            
            elapsed_ms = (time.perf_counter() - start_perf) * 1000
            return {
                "algorithm": "priority_queue",
                "scheduled_jobs": scheduled_jobs,
                "total_profit": 0.0,
                "total_penalty": 0.0,
                "net_profit": 0.0,
                "missed_jobs": [],
                "execution_time_ms": round(elapsed_ms, 4),
                "utilization": round(sum(1 for x in locked_timeline if x is not None) / max(len(locked_timeline), 1), 4),
                "jobs_scheduled": len(scheduled_jobs),
                "jobs_missed": 0,
                "timeline": list(locked_timeline)
            }
        else:
            return _empty_result(start_perf)

    max_deadline = max(j["deadline"] for j in jobs)
    
    if locked_timeline:
        max_deadline = max(max_deadline, len(locked_timeline) - 1)
        timeline = list(locked_timeline) + [None] * max(0, (max_deadline + 1) - len(locked_timeline))
    else:
        timeline = [None] * (max_deadline + 1)

    pq = PriorityQueueManager()

    # Sort jobs by arrival time
    sorted_jobs = sorted(jobs, key=lambda j: j.get("arrival_time", 0))
    job_idx = 0

    scheduled_jobs = []
    scheduled_ids = set()
    total_profit = 0.0

    # If we have a locked timeline, initialize scheduled_ids and scheduled_jobs from it
    if locked_timeline:
        n_slots = len(locked_timeline)
        i = 0
        while i < n_slots:
            jid = locked_timeline[i]
            if jid is not None:
                s = i
                while i < n_slots and locked_timeline[i] == jid:
                    i += 1
                e = i - 1
                scheduled_jobs.append({"job_id": jid, "start_time": s, "end_time": e})
                scheduled_ids.add(jid)
                job_obj = next((j for j in jobs if j["id"] == jid), None)
                if job_obj:
                    total_profit += job_obj["profit"]
            else:
                i += 1

    current_time = start_time

    while current_time <= max_deadline:
        # Add newly arrived jobs
        while job_idx < len(sorted_jobs) and sorted_jobs[job_idx].get("arrival_time", 0) <= current_time:
            if sorted_jobs[job_idx]["id"] not in scheduled_ids:
                pq.add_job(sorted_jobs[job_idx], current_time)
            job_idx += 1

        # Update priorities for current time
        pq.update_priorities(current_time)

        # Try to schedule the highest-priority job
        if timeline[current_time] is None:
            job = pq.pop_job()
            if job is not None:
                duration = job["duration"]
                deadline = job["deadline"]

                # Check if we can fit this job starting now
                end_slot = current_time + duration - 1
                if end_slot <= deadline and end_slot <= max_deadline:
                    can_fit = all(
                        timeline[s] is None
                        for s in range(current_time, end_slot + 1)
                    )
                    if can_fit:
                        for s in range(current_time, end_slot + 1):
                            timeline[s] = job["id"]
                        scheduled_jobs.append({
                            "job_id": job["id"],
                            "start_time": current_time,
                            "end_time": end_slot,
                        })
                        scheduled_ids.add(job["id"])
                        total_profit += job["profit"]
                    else:
                        pq.add_job(job, current_time)
                else:
                    pass

        current_time += 1

    missed_jobs = [j["id"] for j in jobs if j["id"] not in scheduled_ids]
    total_penalty = sum(j["penalty"] for j in jobs if j["id"] not in scheduled_ids)

    elapsed_ms = (time.perf_counter() - start_perf) * 1000
    used_slots = sum(1 for s in timeline if s is not None)
    utilization = used_slots / max(len(timeline), 1)

    return {
        "algorithm": "priority_queue",
        "scheduled_jobs": scheduled_jobs,
        "total_profit": round(total_profit, 2),
        "total_penalty": round(total_penalty, 2),
        "net_profit": round(total_profit - total_penalty, 2),
        "missed_jobs": missed_jobs,
        "execution_time_ms": round(elapsed_ms, 4),
        "utilization": round(utilization, 4),
        "jobs_scheduled": len(scheduled_jobs),
        "jobs_missed": len(missed_jobs),
        "timeline": timeline
    }


def run_priority_queue(jobs: List[Dict], start_time: int = 0, locked_timeline: List = None) -> Dict:
    """
    Wrapper for dynamic rescheduling that returns the format expected by the rescheduling engine.
    """
    res = priority_queue_schedule(jobs, start_time=start_time, locked_timeline=locked_timeline)
    return {
        "timeline": res["timeline"],
        "scheduled": res["scheduled_jobs"],
        "missed": res["missed_jobs"],
        "net_profit": res["net_profit"]
    }


def _empty_result(start_time: float) -> Dict:
    return {
        "algorithm": "priority_queue",
        "scheduled_jobs": [],
        "total_profit": 0.0,
        "total_penalty": 0.0,
        "net_profit": 0.0,
        "missed_jobs": [],
        "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 4),
        "utilization": 0.0,
        "jobs_scheduled": 0,
        "jobs_missed": 0,
        "timeline": []
    }
