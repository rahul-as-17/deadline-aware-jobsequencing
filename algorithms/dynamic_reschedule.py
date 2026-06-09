from dataclasses import dataclass
from typing import List, Dict, Optional, Any
import copy

@dataclass
class RescheduleEvent:
    event_type: str          # "PREEMPTION" | "ERROR" | "URGENT_ARRIVAL"
    affected_job_id: int
    at_time: int
    new_job: Optional[dict]  # only for URGENT_ARRIVAL
    message: str


def apply_dynamic_event(
    current_timeline: List[Optional[int]],
    scheduled_jobs: List[dict],
    missed_jobs: List[int],
    all_jobs: List[dict],
    event: RescheduleEvent,
    current_time: int
) -> dict:
    """
    Given the current scheduler state, applies a disruption event and
    returns a new schedule using the Priority Queue algorithm as the
    real-time re-scheduler.
    """
    timeline = copy.deepcopy(current_timeline)
    active_jobs = copy.deepcopy(all_jobs)
    msg = ""

    # Calculate previous net profit
    job_map = {j["id"]: j for j in all_jobs}
    previous_profit = sum(job_map[sj["job_id"]]["profit"] for sj in scheduled_jobs if sj["job_id"] in job_map)
    previous_penalty = sum(job_map[mj]["penalty"] for mj in missed_jobs if mj in job_map)
    previous_net_profit = previous_profit - previous_penalty

    if event.event_type in ("PREEMPTION", "ERROR"):
        # Evict the affected job from the timeline
        job_id = event.affected_job_id
        for i, slot in enumerate(timeline):
            if slot == job_id:
                timeline[i] = None
        # Reduce remaining duration of affected job proportionally
        job = next((j for j in active_jobs if j["id"] == job_id), None)
        if job:
            already_run = sum(1 for s in range(current_time) if current_timeline[s] == job_id)
            job["duration"] = max(job["duration"] - already_run, 1)
            job["arrival_time"] = event.at_time  # re-enters from current time
            msg = f"Job {job_id} {'preempted' if event.event_type == 'PREEMPTION' else 'errored'} at t={event.at_time}. Re-entering queue with duration={job['duration']} units."
        else:
            msg = f"Job {job_id} not found in active jobs."

    elif event.event_type == "URGENT_ARRIVAL":
        # Inject a brand new high-priority job
        new_job = event.new_job
        active_jobs.append(new_job)
        msg = f"Urgent Job {new_job['id']} arrived at t={event.at_time} (profit=₹{new_job['profit']}, deadline={new_job['deadline']})"

    # Re-run Priority Queue scheduler from current_time onwards on remaining slots
    from algorithms.priority_queue_manager import run_priority_queue
    
    # We select jobs that can still run:
    # 1. Jobs arriving at or after current_time
    # 2. Jobs that arrived in the past but their deadlines are in the future (and they aren't fully completed yet)
    remaining_jobs = []
    for j in active_jobs:
        jid = j["id"]
        # If it's the preempted job, it already has arrival_time updated to event.at_time
        # For other jobs, they are candidates if they can fit in the remaining timeline
        if j["arrival_time"] >= current_time:
            remaining_jobs.append(j)
        elif j["arrival_time"] < current_time and j["deadline"] > current_time:
            # Check if this job has already finished in the locked timeline
            # We count its slots in the locked timeline (before current_time)
            slots_used = sum(1 for s in range(current_time) if timeline[s] == jid)
            if slots_used < j["duration"]:
                # Job is not fully completed yet, adjust duration to remaining part
                j_copy = copy.deepcopy(j)
                j_copy["duration"] = j["duration"] - slots_used
                j_copy["arrival_time"] = current_time # Starts from current_time now
                remaining_jobs.append(j_copy)

    new_result = run_priority_queue(remaining_jobs, start_time=current_time,
                                    locked_timeline=timeline[:current_time])

    # Convert new_missed IDs to integers if they are not already
    new_missed = [int(m) if isinstance(m, (int, float, str)) and str(m).isdigit() else m["id"] if isinstance(m, dict) else m for m in new_result["missed"]]

    return {
        "event_applied": event.__dict__,
        "old_timeline": current_timeline,
        "new_timeline": new_result["timeline"],
        "new_scheduled": new_result["scheduled"],
        "new_missed": new_missed,
        "explanation": msg,
        "net_profit_delta": round(new_result["net_profit"] - previous_net_profit, 2)
    }
