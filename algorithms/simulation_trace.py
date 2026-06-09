from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from algorithms.priority_queue_manager import PriorityQueueManager

@dataclass
class SimulationEvent:
    tick: int
    event_type: str       # "CONSIDER", "SCHEDULE", "REJECT", "HEAP_PUSH", "HEAP_POP"
    job_id: int
    message: str
    state_snapshot: Dict[str, Any]   # full timeline + heap state at this tick

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def trace_greedy(jobs: List[dict]) -> List[SimulationEvent]:
    """
    Runs the greedy scheduler but emits a SimulationEvent at every
    decision point instead of just returning results.
    """
    events = []
    if not jobs:
        return events

    # Sort jobs by profit-to-deadline ratio (descending), then by profit
    sorted_jobs = sorted(
        jobs,
        key=lambda j: (j["profit"] / max(j["deadline"], 1), j["profit"]),
        reverse=True,
    )
    max_slot = max(j["deadline"] for j in jobs)
    timeline = [None] * (max_slot + 1)

    for job in sorted_jobs:
        events.append(SimulationEvent(
            tick=0, event_type="CONSIDER", job_id=job["id"],
            message=f"Considering Job {job['id']} (profit=₹{job['profit']}, deadline={job['deadline']}, duration={job['duration']})",
            state_snapshot={"timeline": list(timeline)}
        ))

        deadline = job["deadline"]
        duration = job["duration"]
        arrival = job.get("arrival_time", 0)

        placed = False
        for end_slot in range(min(deadline, max_slot), arrival + duration - 2, -1):
            start_slot = end_slot - duration + 1
            if start_slot < arrival:
                break
            # Check if all slots in [start_slot, end_slot] are free
            if all(timeline[s] is None for s in range(start_slot, end_slot + 1)):
                for s in range(start_slot, end_slot + 1):
                    timeline[s] = job["id"]
                events.append(SimulationEvent(
                    tick=start_slot, event_type="SCHEDULE", job_id=job["id"],
                    message=f"Scheduled Job {job['id']} in slots {start_slot}–{end_slot}",
                    state_snapshot={"timeline": list(timeline)}
                ))
                placed = True
                break
        if not placed:
            events.append(SimulationEvent(
                tick=0, event_type="REJECT", job_id=job["id"],
                message=f"No available slots found for Job {job['id']} before deadline {deadline} — marked MISSED",
                state_snapshot={"timeline": list(timeline)}
            ))
    return events


def trace_priority_queue(jobs: List[dict]) -> List[SimulationEvent]:
    """
    Emits events at each time tick of the PQ simulation:
    which jobs enter the heap, which get popped and evaluated.
    """
    events = []
    if not jobs:
        return events

    max_time = max(j["deadline"] for j in jobs)
    timeline = [None] * (max_time + 1)
    
    pq = PriorityQueueManager()
    
    # Sort jobs by arrival time
    sorted_jobs = sorted(jobs, key=lambda j: j.get("arrival_time", 0))
    job_idx = 0
    
    current_time = 0
    while current_time <= max_time:
        # Add newly arrived jobs
        while job_idx < len(sorted_jobs) and sorted_jobs[job_idx].get("arrival_time", 0) <= current_time:
            job = sorted_jobs[job_idx]
            priority = pq.add_job(job, current_time)
            events.append(SimulationEvent(
                tick=current_time, event_type="HEAP_PUSH", job_id=job["id"],
                message=f"t={current_time}: Job {job['id']} arrived → pushed to queue (priority score: {priority:.3f})",
                state_snapshot={"timeline": list(timeline), "heap_size": pq.size()}
            ))
            job_idx += 1

        # Update priorities for current time
        pq.update_priorities(current_time)

        # Try to schedule the highest-priority job
        if timeline[current_time] is None:
            job = pq.peek()
            if job is not None:
                # CONSIDER event
                events.append(SimulationEvent(
                    tick=current_time, event_type="CONSIDER", job_id=job["id"],
                    message=f"t={current_time}: Considering highest priority job {job['id']} in queue",
                    state_snapshot={"timeline": list(timeline), "heap_size": pq.size()}
                ))
                
                # Pop the job to process it
                job = pq.pop_job()
                
                duration = job["duration"]
                deadline = job["deadline"]

                # Check if we can fit this job starting now
                end_slot = current_time + duration - 1
                if end_slot <= deadline and end_slot <= max_time:
                    can_fit = all(
                        timeline[s] is None
                        for s in range(current_time, end_slot + 1)
                    )
                    if can_fit:
                        for s in range(current_time, end_slot + 1):
                            timeline[s] = job["id"]
                        events.append(SimulationEvent(
                            tick=current_time, event_type="SCHEDULE", job_id=job["id"],
                            message=f"t={current_time}: Scheduled Job {job['id']} in slots {current_time}–{end_slot}",
                            state_snapshot={"timeline": list(timeline), "heap_size": pq.size()}
                        ))
                    else:
                        # Put it back and try later
                        pq.add_job(job, current_time)
                        events.append(SimulationEvent(
                            tick=current_time, event_type="REJECT", job_id=job["id"],
                            message=f"t={current_time}: Job {job['id']} cannot fit starting at {current_time} — put back in queue",
                            state_snapshot={"timeline": list(timeline), "heap_size": pq.size()}
                        ))
                else:
                    # Can't fit before deadline — job is lost
                    events.append(SimulationEvent(
                        tick=current_time, event_type="REJECT", job_id=job["id"],
                        message=f"t={current_time}: Job {job['id']} cannot meet its deadline {deadline} — marked MISSED",
                        state_snapshot={"timeline": list(timeline), "heap_size": pq.size()}
                    ))
        
        current_time += 1

    return events
