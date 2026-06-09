from typing import List, Dict, Optional, Any

def generate_local_explanation(
    algorithm: str,
    jobs: List[dict],
    scheduled: List[dict],
    missed: List[int],
    net_profit: float
) -> str:
    """
    Algorithmic explainer that creates a detailed, academic narration of a schedule.
    Acts as the default local fallback if the LLM client is unavailable.
    """
    job_map = {j["id"]: j for j in jobs}
    algo_name = algorithm.replace("_", " ").upper()

    explanation = []
    explanation.append(f"### DAA Academic Report: {algo_name} Scheduling Decisions\n")
    explanation.append(f"**Performance Overview**: Excecution resulted in a **Net Profit of ₹{net_profit}**.")
    explanation.append(f"- **Scheduled Jobs**: {len(scheduled)} out of {len(jobs)}")
    explanation.append(f"- **Missed/Dropped Jobs**: {len(missed)}\n")

    explanation.append("#### 1. Scheduling Decision Narrative")
    if algorithm == "greedy":
        explanation.append(
            "The **Greedy Scheduler** orders jobs descending by their **Profit-to-Deadline Ratio** ($\\frac{P_i}{D_i}$). "
            "It searches backwards from each job's deadline to locate the latest available free contiguous slots matching its duration. "
            "This strategy prioritizes jobs with high immediate yield per time unit of urgency."
        )
    elif algorithm == "priority_queue":
        explanation.append(
            "The **Priority Queue Scheduler** runs a dynamic event loop stepping unit-by-unit. "
            "As jobs arrive, they are queued in a Max-Heap ordered by a composite priority score: "
            "$0.4 \\cdot \\text{Profit} + 0.35 \\cdot \\text{Urgency} (1/(1+\\text{Slack})) + 0.25 \\cdot \\text{Penalty}$. "
            "At each tick, the highest priority job is popped and scheduled if slots fit."
        )
    else:
        explanation.append(
            f"The **{algo_name} Scheduler** analyzed the overlaps, profits, and penalties to layout the jobs."
        )

    explanation.append("\n#### 2. Detailed Job Audits")
    # Audit scheduled jobs
    if scheduled:
        explanation.append("\n**Scheduled Selections**:")
        for sj in sorted(scheduled, key=lambda x: x["start_time"]):
            jid = sj["job_id"]
            job = job_map.get(jid)
            if job:
                explanation.append(
                    f"- **Job {jid}** (Profit: ₹{job['profit']}, Penalty: ₹{job['penalty']}): "
                    f"Allocated slots `t={sj['start_time']}` to `t={sj['end_time']}`. "
                    f"Selected because it offered high yield and fit within the available timeframe."
                )
    
    # Audit missed jobs
    if missed:
        explanation.append("\n**Unscheduled/Missed Items**:")
        for jid in missed:
            job = job_map.get(jid)
            if job:
                explanation.append(
                    f"- **Job {jid}** (Profit: ₹{job['profit']}, Penalty: ₹{job['penalty']}, Deadline: t={job['deadline']}): "
                    f"Missed. The algorithm could not find a free contiguous block of {job['duration']} slot(s) between "
                    f"its arrival time (t={job['arrival_time']}) and deadline (t={job['deadline']}) due to overlaps with higher priority jobs. "
                    f"Incurred a penalty of ₹{job['penalty']}."
                )
    else:
        explanation.append("\n- No jobs missed! The timeline achieved complete coverage of all submitted tasks.")

    # Academic insight
    explanation.append("\n#### 3. Complexity & Theoretical Takeaways")
    if algorithm == "greedy":
        explanation.append(
            "- **Complexity Class**: $\\mathcal{O}(n \\log n)$ for sorting + $\\mathcal{O}(n \\cdot d)$ for slot allocation. "
            "Highly efficient offline heuristic, though vulnerable to suboptimal packing in highly dense overlap structures."
        )
    elif algorithm == "priority_queue":
        explanation.append(
            "- **Complexity Class**: $\\mathcal{O}(n \\log n)$ heap operations. "
            "Perfect for online streaming, reactively adapting to changing slack values as time units advance."
        )
    else:
        explanation.append(
            "- Highly scalable scheduling execution, balancing overhead vs optimality."
        )

    return "\n".join(explanation)


def generate_local_reschedule_explanation(
    event_type: str,
    affected_id: int,
    at_time: int,
    delta: float,
    all_jobs: List[dict]
) -> str:
    """
    Dynamic rescheduling analyzer that explains the impact of preemption, errors, or urgent arrivals.
    Acts as the default local fallback if the LLM client is unavailable.
    """
    job_map = {j["id"]: j for j in all_jobs}
    
    explanation = []
    explanation.append(f"### ⚡ Rescheduling Impact Analysis: Event [{event_type}]\n")
    explanation.append(f"**Dynamic Disruption Log**: Applied at time **t = {at_time}**.")
    explanation.append(f"**System Yield Impact**: Profit delta of **₹{delta:+.2f}** compared to original schedule.\n")

    explanation.append("#### 1. Breakdown of the Disruption Event")
    if event_type == "PREEMPTION":
        job = job_map.get(affected_id)
        job_info = f"Job {affected_id} (Profit: ₹{job['profit']})" if job else f"Job {affected_id}"
        explanation.append(
            f"The running execution of **{job_info}** was preemptively halted (evicted) at tick `t={at_time}`. "
            "Its allocated future slots were freed, and it was put back into the ready queue. "
            "The remaining workload duration was recalculated and scheduled relative to its updated arrival time."
        )
    elif event_type == "ERROR":
        job = job_map.get(affected_id)
        job_info = f"Job {affected_id} (Penalty: ₹{job['penalty']})" if job else f"Job {affected_id}"
        explanation.append(
            f"An execution exception occurred in **{job_info}** at tick `t={at_time}` causing it to crash and evict. "
            "The system evicted its slots, marked it as failed, and re-scheduled the remaining time slots to recover."
        )
    elif event_type == "URGENT_ARRIVAL":
        explanation.append(
            f"A high-priority urgent task arrived dynamically at tick `t={at_time}`. "
            "The scheduler ran an online re-optimization loop, preempting lower-priority future work to fit this urgent task."
        )

    explanation.append("\n#### 2. Re-optimization Decisions & Profit Delta")
    if delta > 0:
        explanation.append(
            f"- **Positive Delta (+₹{delta})**: The disruption allowed the system to schedule a higher-yield job set. "
            "By clearing the slots or injecting a highly profitable task, the net profit increased despite penalty or eviction costs."
        )
    elif delta < 0:
        explanation.append(
            f"- **Negative Delta (₹{delta:+.2f})**: The crash/preemption forced the system to miss deadlines or pay penalty costs. "
            "Re-running the Priority Queue scheduler helped mitigate losses, but could not completely cover the eviction penalty."
        )
    else:
        explanation.append(
            "- **Zero Delta (₹0.00)**: The layout disruption did not change the total net profit. "
            "The evicted/preempted task was either successfully rescheduled later without missing deadlines, or replaced by jobs of identical net profit."
        )

    explanation.append("\n#### 3. Algorithmic Healing & Recovery Strategy")
    explanation.append(
        "To perform real-time healing, the backend preserved all execution history up to `t=currentTime`. "
        "From this point onwards, it re-evaluated remaining jobs using a **Dynamic Heap Simulation**. "
        "This online scheduling adjustment allows the system to recover from dynamic environmental failures with minimum loss."
    )

    return "\n".join(explanation)
