import { useState, useEffect, useRef, useCallback } from "react";
import GanttChart from "../components/GanttChart";
import { AlertTriangle, Zap, XCircle, RefreshCw, Clock, Play, Pause, RotateCcw, ArrowRight, CheckCircle2, ListFilter, PlayCircle, TrendingUp } from "lucide-react";
import { schedulePriority, runReschedule, explainReschedule } from "../api";

const EVENT_ICONS = {
  PREEMPTION:    <AlertTriangle size={15} style={{ color: "#f59e0b" }} />,
  ERROR:         <XCircle size={15} style={{ color: "#ef4444" }} />,
  URGENT_ARRIVAL:<Zap size={15} style={{ color: "#10b981" }} />,
};

const defaultJobs = [
  { id: 1, arrival_time: 0, duration: 2, deadline: 5, profit: 80,  penalty: 15 },
  { id: 2, arrival_time: 1, duration: 1, deadline: 3, profit: 50,  penalty: 10 },
  { id: 3, arrival_time: 2, duration: 3, deadline: 7, profit: 120, penalty: 30 },
  { id: 4, arrival_time: 0, duration: 2, deadline: 4, profit: 70,  penalty: 20 },
  { id: 5, arrival_time: 3, duration: 1, deadline: 6, profit: 40,  penalty: 15 },
];

const PALETTE = ["#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed", "#ea580c", "#65a30d"];

const parseBoldItalic = (text) => {
  let formatted = text
    .replace(/\$\\frac\{P_i\}\{D_i\}\$/g, "P_i/D_i")
    .replace(/\$0\.4 \\cdot \\text\{Profit\} \+ 0\.35 \\cdot \\text\{Urgency\} \(1\/\(1\+\\text\{Slack\}\)\) \+ 0\.25 \\cdot \\text\{Penalty\}\$/g, "0.4 * Profit + 0.35 * Urgency (1/(1+Slack)) + 0.25 * Penalty")
    .replace(/\$\\mathcal\{O\}\(n \\log n\)\$/g, "O(n log n)")
    .replace(/\$\\mathcal\{O\}\(n \\cdot d\)\$/g, "O(n * d)");

  const parts = formatted.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: "var(--text-primary)" }}>{part}</strong>;
    }
    const codeParts = part.split(/`([^`]+)`/g);
    return codeParts.map((subPart, j) => {
      if (j % 2 === 1) {
        return <code key={j} className="text-mono" style={{ background: "var(--bg-input)", padding: "0.1rem 0.3rem", borderRadius: "4px", fontSize: "0.85em", border: "1px solid var(--border-subtle)" }}>{subPart}</code>;
      }
      return subPart;
    });
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="markdown-body" style={{ lineHeight: "1.6", color: "var(--text-secondary)" }}>
      {lines.map((line, idx) => {
        if (line.startsWith("### ")) {
          return <h3 key={idx} style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-subtle)", marginTop: "1.5rem", marginBottom: "0.75rem", paddingBottom: "0.25rem", fontWeight: 700, fontSize: "1.1rem" }}>{line.replace("### ", "")}</h3>;
        }
        if (line.startsWith("#### ")) {
          return <h4 key={idx} style={{ color: "var(--text-primary)", marginTop: "1.25rem", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.95rem" }}>{line.replace("#### ", "")}</h4>;
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const content = line.substring(2);
          return (
            <div key={idx} style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem", marginBottom: "0.4rem" }}>
              <span style={{ color: "var(--accent)" }}>•</span>
              <span>{parseBoldItalic(content)}</span>
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={idx} style={{ height: "0.5rem" }} />;
        }
        return <p key={idx} style={{ marginBottom: "0.75rem" }}>{parseBoldItalic(line)}</p>;
      })}
    </div>
  );
};

export default function DynamicSchedulerPage({ addToast }) {
  const [jobs, setJobs] = useState(defaultJobs);
  const [schedule, setSchedule] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per step
  const [history, setHistory] = useState([]); // Dynamic disruption log
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("random");
  const [urgentJobConfig, setUrgentJobConfig] = useState({ profit: 180, penalty: 60, duration: 2 });
  const [activeExplain, setActiveExplain] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const intervalRef = useRef(null);

  // Compute color mapping
  const jobColorMap = {};
  jobs.forEach((j, i) => {
    jobColorMap[j.id] = PALETTE[i % PALETTE.length];
  });

  const handleExplainReschedule = async (item) => {
    setExplainLoading(true);
    try {
      const response = await explainReschedule({
        event_type: item.type,
        affected_job_id: item.affected_job_id,
        at_time: item.timestamp,
        delta: item.delta,
        all_jobs: jobs
      });
      setActiveExplain({
        type: item.type,
        timestamp: item.timestamp,
        explanation: response.explanation
      });
      addToast("Oracle impact explanation generated!", "success");
    } catch (err) {
      addToast("Failed to fetch disruption explanation.", "error");
    } finally {
      setExplainLoading(false);
    }
  };

  const runInitialSchedule = useCallback(async () => {
    setLoading(true);
    setPlaying(false);
    try {
      const data = await schedulePriority(jobs);
      setSchedule({
        timeline: data.timeline,
        scheduled: data.scheduled_jobs,
        missed: data.missed_jobs,
        net_profit: data.net_profit,
      });
      setCurrentTime(0);
      setHistory([]);
      setActiveExplain(null);
      addToast("Initial Priority Queue schedule computed!", "success");
    } catch {
      addToast("Failed to compute initial schedule.", "error");
    } finally {
      setLoading(false);
    }
  }, [jobs, addToast]);

  // Autoplay loop for timeline increments
  useEffect(() => {
    if (playing && schedule) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(t => {
          if (t >= schedule.timeline.length - 1) {
            setPlaying(false);
            return t;
          }
          return t + 1;
        });
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, schedule]);

  const triggerEvent = async (eventType) => {
    if (!schedule) {
      addToast("Please run the initial schedule first.", "info");
      return;
    }
    setLoading(true);

    // Filter jobs currently running or scheduled at or before current time
    const scheduledJobIds = schedule.scheduled
      .filter(s => s.start_time <= currentTime && s.end_time >= currentTime)
      .map(s => s.job_id);

    // If none are currently active, look for any scheduled jobs that are upcoming or recently executed
    if (scheduledJobIds.length === 0 && eventType !== "URGENT_ARRIVAL") {
      const allActiveScheduled = schedule.scheduled.map(s => s.job_id);
      if (allActiveScheduled.length > 0) {
        scheduledJobIds.push(...allActiveScheduled);
      }
    }

    let targetId = null;
    if (eventType !== "URGENT_ARRIVAL") {
      if (selectedJobId === "random") {
        if (scheduledJobIds.length === 0) {
          addToast("No scheduled jobs exist to disrupt.", "info");
          setLoading(false);
          return;
        }
        targetId = scheduledJobIds[Math.floor(Math.random() * scheduledJobIds.length)];
      } else {
        targetId = parseInt(selectedJobId, 10);
      }
    }

    const urgentJobId = 99 + history.length;
    const event = {
      event_type: eventType,
      affected_job_id: eventType === "URGENT_ARRIVAL" ? urgentJobId : (targetId || 0),
      at_time: currentTime,
      new_job: eventType === "URGENT_ARRIVAL" ? {
        id: urgentJobId,
        arrival_time: currentTime,
        duration: urgentJobConfig.duration,
        deadline: currentTime + urgentJobConfig.duration + 2,
        profit: urgentJobConfig.profit,
        penalty: urgentJobConfig.penalty
      } : null,
      message: ""
    };

    try {
      const result = await runReschedule({
        event,
        current_timeline: schedule.timeline,
        scheduled_jobs: schedule.scheduled,
        missed_jobs: schedule.missed,
        all_jobs: jobs,
        current_time: currentTime
      });

      if (eventType === "URGENT_ARRIVAL") {
        setJobs(prev => [...prev, event.new_job]);
      }

      setSchedule(prev => ({
        ...prev,
        timeline: result.new_timeline,
        scheduled: result.new_scheduled,
        missed: result.new_missed,
        net_profit: prev.net_profit + result.net_profit_delta,
      }));

      setHistory(h => [
        {
          type: eventType,
          message: result.explanation,
          delta: result.net_profit_delta,
          timestamp: currentTime,
          affected_job_id: event.affected_job_id,
        },
        ...h
      ]);

      addToast(`Disruption event [${eventType}] applied at t=${currentTime}!`, "success");
    } catch (err) {
      addToast("Failed to recalculate rescheduling layout.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Categorize jobs at the current time tick
  const getJobStatusAtCurrentTime = (job) => {
    if (!schedule) return "idle";

    const scheduledSegment = schedule.scheduled.find(s => s.job_id === job.id);
    const isMissed = schedule.missed.includes(job.id);

    if (isMissed) {
      if (job.deadline <= currentTime) return "missed";
      return "waiting"; // Has not met deadline yet, still in queue
    }

    if (scheduledSegment) {
      if (scheduledSegment.end_time < currentTime) return "completed";
      if (scheduledSegment.start_time <= currentTime && scheduledSegment.end_time >= currentTime) return "running";
      if (scheduledSegment.start_time > currentTime) {
        if (job.arrival_time <= currentTime) return "waiting"; // Arrived, waiting for future slot
        return "future"; // Not arrived yet
      }
    }
    return "idle";
  };

  // Helper: Calculate composite priority score (educational simulation)
  const calculateScore = (job) => {
    const maxProfit = Math.max(...jobs.map(j => j.profit)) || 1.0;
    const maxPenalty = Math.max(...jobs.map(j => j.penalty)) || 1.0;

    const profitScore = job.profit / maxProfit;
    const slack = job.deadline - currentTime - job.duration;
    const urgencyScore = slack <= 0 ? 1.0 : 1.0 / (1.0 + slack);
    const penaltyScore = job.penalty / maxPenalty;

    const score = 0.4 * profitScore + 0.35 * urgencyScore + 0.25 * penaltyScore;
    return score;
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚡ Dynamic Rescheduling Engine</h2>
        <p>Observe how the Priority Queue scheduler reactively heals when dynamic disruptions occur mid-timeline.</p>
      </div>

      {/* Initial Schedule Trigger */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="flex-between">
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Step 1: Bootstrap the timeline with the initial scheduling layout before injecting failures.
            </span>
          </div>
          <button className="btn btn-primary" onClick={runInitialSchedule} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Run Initial Schedule
          </button>
        </div>
      </div>

      {schedule && (
        <div>
          {/* Gantt Timeline & Autoplay Controls */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div className="card-title" style={{ margin: 0 }}><Clock size={14} /> Timeline Progress Playback</div>
              <div className="text-mono" style={{ fontSize: "0.82rem", background: "var(--accent-soft)", color: "var(--accent)", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 700 }}>
                Time: t = {currentTime}
              </div>
            </div>

            <GanttChart scheduledJobs={schedule.scheduled} allJobs={jobs} highlightTime={currentTime} />

            {/* Time Slider & Play Button */}
            <div className="flex-row" style={{ marginTop: "1.25rem", background: "var(--bg-input)", padding: "0.8rem 1.25rem", borderRadius: "var(--radius-sm)", gap: "1rem" }}>
              <button className="btn btn-ghost" style={{ padding: "0.45rem" }} onClick={() => setCurrentTime(0)}>
                <RotateCcw size={15} />
              </button>
              <button className="btn btn-ghost" style={{ padding: "0.45rem 1rem", minWidth: "90px", justifyContent: "center" }} onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={15} /> : <Play size={15} />}
                <span style={{ marginLeft: 6 }}>{playing ? "Pause" : "Play"}</span>
              </button>

              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, schedule.timeline.length - 1)}
                  value={currentTime}
                  onChange={e => setCurrentTime(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Speed:</span>
                <input
                  type="range"
                  min={400}
                  max={2000}
                  step={200}
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  style={{ width: "80px", accentColor: "var(--accent)" }}
                />
                <span className="text-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", minWidth: "40px" }}>{speed}ms</span>
              </div>
            </div>
          </div>

          {/* Main Workspace Dashboard */}
          <div className="grid-2" style={{ gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem", alignItems: "start", marginBottom: "1.5rem" }}>
            {/* Left: Dynamic Disruption Center */}
            <div className="card">
              <div className="card-title"><PlayCircle size={14} /> Inject Disruption Event</div>
              
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: "1.6" }}>
                Choose a job that is scheduled or running at the current time pointer. Preempting or crashing it causes it to release its remaining duration back into the queue starting at <strong>t = {currentTime}</strong>.
              </p>

              <div className="flex-row" style={{ gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Disrupt Target Job</label>
                  <select
                    className="form-select mono"
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                  >
                    <option value="random">🎲 Random scheduled job</option>
                    {schedule.scheduled.map(sj => (
                      <option key={sj.job_id} value={sj.job_id}>
                        J{sj.job_id} (Slots: {sj.start_time} - {sj.end_time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn"
                  onClick={() => triggerEvent("PREEMPTION")}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "0.75rem 1rem", border: "1px solid #f59e0b",
                    background: "rgba(245, 158, 11, 0.08)", color: "#f59e0b", fontWeight: 700,
                    display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <AlertTriangle size={15} /> Preempt J{selectedJobId === "random" ? "Random" : selectedJobId}
                </button>
                <button
                  className="btn"
                  onClick={() => triggerEvent("ERROR")}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "0.75rem 1rem", border: "1px solid #ef4444",
                    background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontWeight: 700,
                    display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <XCircle size={15} /> Crash/Error J{selectedJobId === "random" ? "Random" : selectedJobId}
                </button>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "1.5rem 0" }} />

              <div className="form-label" style={{ marginBottom: "0.50rem" }}>Inject Urgent Job Arrival at t = {currentTime}</div>
              <div className="flex-row" style={{ gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: "0.68rem" }}>Profit (₹)</label>
                  <input
                    className="form-input mono"
                    type="number"
                    value={urgentJobConfig.profit}
                    onChange={e => setUrgentJobConfig(prev => ({ ...prev, profit: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: "0.68rem" }}>Penalty (₹)</label>
                  <input
                    className="form-input mono"
                    type="number"
                    value={urgentJobConfig.penalty}
                    onChange={e => setUrgentJobConfig(prev => ({ ...prev, penalty: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: "0.68rem" }}>Duration</label>
                  <input
                    className="form-input mono"
                    type="number"
                    min={1}
                    max={4}
                    value={urgentJobConfig.duration}
                    onChange={e => setUrgentJobConfig(prev => ({ ...prev, duration: parseInt(e.target.value, 10) || 1 }))}
                  />
                </div>
              </div>

              <button
                className="btn"
                onClick={() => triggerEvent("URGENT_ARRIVAL")}
                disabled={loading}
                style={{
                  width: "100%", padding: "0.75rem 1rem", border: "1px solid #10b981",
                  background: "rgba(16, 185, 129, 0.08)", color: "#10b981", fontWeight: 700,
                  display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center"
                }}
              >
                <Zap size={15} /> Inject Urgent Job (ID: {99 + history.length})
              </button>
            </div>

            {/* Right: Rescheduling Log History */}
            <div className="card" style={{ height: "420px", display: "flex", flexDirection: "column" }}>
              <div className="card-title">Rescheduling Impact History</div>
              
              {history.length === 0 ? (
                <div className="empty-state" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  <TrendingUp size={36} style={{ opacity: 0.25 }} />
                  <p>Disruptions will trigger real-time healing updates and calculate profit deltas.</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem 1rem", marginBottom: "0.5rem",
                        background: "var(--bg-input)", borderRadius: "var(--radius-sm)",
                        borderLeft: `4px solid ${item.delta >= 0 ? "var(--emerald)" : "var(--rose)"}`
                      }}
                    >
                      <div className="flex-between" style={{ marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {EVENT_ICONS[item.type]} {item.type}
                          <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>at t={item.timestamp}</span>
                        </span>
                        <span className="text-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: item.delta >= 0 ? "var(--emerald)" : "var(--rose)" }}>
                          Profit Δ: {item.delta >= 0 ? `+₹${item.delta}` : `-₹${Math.abs(item.delta)}`}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", lineHeight: 1.5 }}>
                        {item.message}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                        <button
                          className="btn btn-ghost"
                          style={{
                            fontSize: "0.68rem",
                            padding: "0.2rem 0.5rem",
                            height: "auto",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)"
                          }}
                          onClick={() => handleExplainReschedule(item)}
                          disabled={explainLoading}
                        >
                          🔮 Explain Impact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job State Tracker at Current Pointer */}
          <div className="card">
            <div className="card-title"><ListFilter size={14} /> Job Status Tracker at t = {currentTime}</div>
            
            <div style={{ overflowX: "auto" }}>
              <table className="job-table" style={{ fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th>Job ID</th>
                    <th>Arrival</th>
                    <th>Duration</th>
                    <th>Deadline</th>
                    <th>Profit</th>
                    <th>Penalty</th>
                    <th>Priority Score (at t={currentTime})</th>
                    <th>Execution Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const status = getJobStatusAtCurrentTime(job);
                    const score = calculateScore(job);
                    
                    return (
                      <tr key={job.id} style={{ opacity: status === "completed" ? 0.6 : 1 }}>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: jobColorMap[job.id], marginRight: 6 }} />
                          J{job.id}
                        </td>
                        <td className="mono">{job.arrival_time}</td>
                        <td className="mono">{job.duration}</td>
                        <td className="mono">{job.deadline}</td>
                        <td className="mono">₹{job.profit}</td>
                        <td className="mono">₹{job.penalty}</td>
                        <td className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {score.toFixed(3)}
                        </td>
                        <td>
                          {status === "completed" && (
                            <span style={{ color: "var(--emerald)", fontSize: "0.72rem", background: "var(--emerald-soft)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                              ✅ Completed
                            </span>
                          )}
                          {status === "running" && (
                            <span style={{ color: "var(--accent)", fontSize: "0.72rem", background: "var(--accent-soft)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700, animation: "pulse 1.5s infinite" }}>
                              ⚡ Running
                            </span>
                          )}
                          {status === "waiting" && (
                            <span style={{ color: "var(--amber)", fontSize: "0.72rem", background: "rgba(217,119,6,0.08)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                              ⏳ In Queue
                            </span>
                          )}
                          {status === "future" && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", background: "var(--bg-input)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                              📅 Future (Un-arrived)
                            </span>
                          )}
                          {status === "missed" && (
                            <span style={{ color: "var(--rose)", fontSize: "0.72rem", background: "var(--rose-soft)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                              ❌ Missed
                            </span>
                          )}
                          {status === "idle" && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Oracle Rescheduling Explanation Card */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div className="card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock size={15} style={{ color: "var(--accent)" }} />
                <span>Oracle Rescheduling Impact Analysis</span>
              </div>
              {explainLoading && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Analyzing healing trace...</span>}
            </div>

            {activeExplain ? (
              <div style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem 1.5rem",
                maxHeight: "350px",
                overflowY: "auto"
              }}>
                {renderMarkdown(activeExplain.explanation)}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "2rem 0" }}>
                <Clock size={32} style={{ opacity: 0.2, marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Click "Explain Impact" on any history log entry above to dissect why scheduling layout decisions healed in this manner.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS animation for running pulse indicator */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
