import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, ArrowRight, Video, Shuffle, HelpCircle, Activity } from "lucide-react";
import { runSimulation, generateJobs, explainSchedule } from "../api";
import GanttChart from "../components/GanttChart";

const COLORS = {
  SCHEDULE: "#10b981",  // Emerald
  REJECT:   "#ef4444",  // Rose
  CONSIDER: "#f59e0b",  // Amber
  HEAP_PUSH:"#3b82f6",  // Accent blue
  HEAP_POP: "#8b5cf6",  // Purple
};

const defaultJobs = [
  { id: 1, arrival_time: 0, duration: 2, deadline: 4, profit: 100, penalty: 20 },
  { id: 2, arrival_time: 1, duration: 1, deadline: 3, profit: 60,  penalty: 10 },
  { id: 3, arrival_time: 2, duration: 2, deadline: 5, profit: 80,  penalty: 15 },
  { id: 4, arrival_time: 0, duration: 3, deadline: 6, profit: 120, penalty: 30 },
  { id: 5, arrival_time: 3, duration: 1, deadline: 4, profit: 50,  penalty: 25 },
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
};export default function SimulationPage({ addToast }) {
  const [jobs, setJobs] = useState(defaultJobs);
  const [events, setEvents] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);  // ms per step
  const [algorithm, setAlgorithm] = useState("greedy");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    setExplanation(null);
  }, [algorithm]);

  const getFinalResults = () => {
    if (events.length === 0) return { scheduled: [], missed: [], net_profit: 0 };
    const finalEvent = events[events.length - 1];
    const finalTimeline = finalEvent?.state_snapshot?.timeline ?? [];
    
    const scheduled = [];
    const n = finalTimeline.length;
    let i = 0;
    while (i < n) {
      const jid = finalTimeline[i];
      if (jid !== null) {
        const start = i;
        while (i < n && finalTimeline[i] === jid) {
          i++;
        }
        scheduled.push({ job_id: jid, start_time: start, end_time: i - 1 });
      } else {
        i++;
      }
    }
    
    const scheduledIds = new Set(scheduled.map(s => s.job_id));
    const missed = jobs.filter(j => !scheduledIds.has(j.id)).map(j => j.id);
    
    let totalProfit = 0;
    let totalPenalty = 0;
    jobs.forEach(job => {
      if (scheduledIds.has(job.id)) {
        totalProfit += job.profit;
      } else {
        totalPenalty += job.penalty;
      }
    });
    const net_profit = totalProfit - totalPenalty;
    
    return { scheduled, missed, net_profit };
  };

  const handleExplainSchedule = async () => {
    setExplaining(true);
    try {
      const results = getFinalResults();
      const response = await explainSchedule({
        algorithm: algorithm,
        jobs: jobs,
        scheduled: results.scheduled,
        missed: results.missed,
        net_profit: results.net_profit
      });
      setExplanation(response.explanation);
      addToast("Oracle explanation generated!", "success");
    } catch (err) {
      addToast("Failed to generate Oracle explanation.", "error");
    } finally {
      setExplaining(false);
    }
  };

  const loadSimulation = useCallback(async () => {
    if (!jobs.length) {
      addToast("Please add or generate jobs first.", "info");
      return;
    }
    setLoading(true);
    setPlaying(false);
    setStepIndex(-1);
    setEvents([]);
    setExplanation(null);
    try {
      const data = await runSimulation(jobs, algorithm);
      setEvents(data.events);
      if (data.events.length > 0) {
        setStepIndex(0);
      }
      addToast(`Simulation loaded successfully!`, "success");
    } catch (err) {
      addToast("Failed to fetch simulation from server.", "error");
    } finally {
      setLoading(false);
    }
  }, [jobs, algorithm, addToast]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateJobs(6, 10);
      setJobs(data.jobs);
      setEvents([]);
      setStepIndex(-1);
      setExplanation(null);
      addToast("Generated 6 random jobs.", "success");
    } catch {
      addToast("Failed to generate jobs.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Playback looping
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStepIndex(i => {
          if (i >= events.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, events.length]);

  const currentEvent = events[stepIndex];
  const timeline = currentEvent?.state_snapshot?.timeline ?? [];
  const heapSize = currentEvent?.state_snapshot?.heap_size ?? 0;

  // Generate color map for job blocks
  const jobColorMap = {};
  jobs.forEach((j, i) => {
    jobColorMap[j.id] = PALETTE[i % PALETTE.length];
  });

  // Compile Gantt representation for current timeline state
  const getScheduledJobsFromTimeline = () => {
    const scheduled = [];
    const n = timeline.length;
    let i = 0;
    while (i < n) {
      const jid = timeline[i];
      if (jid !== null) {
        const start = i;
        while (i < n && timeline[i] === jid) {
          i++;
        }
        scheduled.append({ job_id: jid, start_time: start, end_time: i - 1 });
      } else {
        i++;
      }
    }
    return scheduled;
  };

  // Wait, let's write append correctly in Javascript (it's push!)
  const getScheduledJobsJS = () => {
    const scheduled = [];
    const n = timeline.length;
    let i = 0;
    while (i < n) {
      const jid = timeline[i];
      if (jid !== null) {
        const start = i;
        while (i < n && timeline[i] === jid) {
          i++;
        }
        scheduled.push({ job_id: jid, start_time: start, end_time: i - 1 });
      } else {
        i++;
      }
    }
    return scheduled;
  };

  const currentScheduled = getScheduledJobsJS();

  return (
    <div>
      <div className="page-header">
        <h2>🎬 Live Scheduling Simulation</h2>
        <p>Visually step through how algorithms construct scheduling decisions tick by tick.</p>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1fr 2fr", gap: "1.5rem", alignItems: "start", marginBottom: "1.5rem" }}>
        {/* Left: Setup Card */}
        <div className="card">
          <div className="card-title"><Video size={14} /> Configuration</div>
          
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Algorithm</label>
            <select
              className="form-select"
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value)}
              disabled={loading}
            >
              <option value="greedy">Greedy</option>
              <option value="priority_queue">Priority Queue</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.50rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={loadSimulation} disabled={loading} style={{ flex: 1 }}>
              {loading ? "Loading..." : "Load Simulation"}
            </button>
            <button className="btn btn-ghost" onClick={handleGenerate} disabled={loading}>
              <Shuffle size={14} /> Generate
            </button>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <div className="form-label" style={{ marginBottom: "0.5rem" }}>Active Job Set ({jobs.length})</div>
            <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", background: "var(--bg-input)" }}>
              {jobs.map((job, idx) => (
                <div key={job.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.6rem", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.75rem" }}>
                  <span style={{ fontWeight: 600 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: jobColorMap[job.id], marginRight: 6 }} />
                    J{job.id}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Arr:{job.arrival_time} | Dur:{job.duration} | Dl:{job.deadline} | Prof:₹{job.profit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Simulation Player */}
        <div className="card" style={{ minHeight: "360px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div className="card-title" style={{ margin: 0 }}><Activity size={14} /> Playback Control</div>
              {events.length > 0 && (
                <span className="text-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Step {stepIndex + 1} / {events.length}
                </span>
              )}
            </div>

            {events.length === 0 ? (
              <div className="empty-state" style={{ padding: "4rem 0" }}>
                <Video size={40} style={{ opacity: 0.3 }} />
                <p>Click "Load Simulation" to initialize the trace.</p>
              </div>
            ) : (
              <div>
                {/* Control bar */}
                <div className="flex-row" style={{ background: "var(--bg-input)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", gap: "1rem" }}>
                  <button className="btn btn-ghost" style={{ padding: "0.4rem" }} onClick={() => setStepIndex(0)} title="Rewind to Start">
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem 1rem", minWidth: "80px", justifyContent: "center" }}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                    <span style={{ marginLeft: 6 }}>{playing ? "Pause" : "Play"}</span>
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem" }}
                    disabled={stepIndex >= events.length - 1}
                    onClick={() => setStepIndex(i => Math.min(events.length - 1, i + 1))}
                    title="Next Step"
                  >
                    <ArrowRight size={16} />
                  </button>

                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Speed:</span>
                    <input
                      type="range"
                      min={200}
                      max={2000}
                      step={100}
                      value={speed}
                      onChange={e => setSpeed(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                    <span className="text-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", minWidth: "45px" }}>{speed}ms</span>
                  </div>
                </div>

                {/* Event Alert Message */}
                {currentEvent && (
                  <div style={{
                    marginTop: "1.25rem", padding: "1rem 1.25rem",
                    background: `${COLORS[currentEvent.event_type]}10`,
                    borderLeft: `4px solid ${COLORS[currentEvent.event_type]}`,
                    borderRadius: "var(--radius-sm)", fontSize: "0.85rem",
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <strong style={{ color: COLORS[currentEvent.event_type], textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                        [{currentEvent.event_type}]
                      </strong>
                      {currentEvent.event_type.startsWith("HEAP") && (
                        <span className="text-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          Queue size: {heapSize}
                        </span>
                      )}
                    </div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {currentEvent.message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <div className="form-label" style={{ marginBottom: "0.5rem" }}>Progress Tracker</div>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((stepIndex + 1) / events.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {events.length > 0 && (
        <div className="grid-2" style={{ gap: "1.5rem" }}>
          {/* Gantt Timeline */}
          <div className="card">
            <div className="card-title">Gantt Layout Trace</div>
            <GanttChart scheduledJobs={currentScheduled} allJobs={jobs} highlightTime={currentEvent?.tick} />
          </div>

          {/* Historical Log */}
          <div className="card">
            <div className="card-title">Algorithm Event Log</div>
            <div style={{
              maxHeight: "280px", overflowY: "auto",
              background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "1rem",
              border: "1px solid var(--border-subtle)"
            }}>
              {events.slice(0, stepIndex + 1).map((ev, i) => (
                <div key={i} style={{
                  fontSize: "0.78rem",
                  padding: "0.4rem 0",
                  borderBottom: "1px solid rgba(0,0,0,0.03)",
                  color: i === stepIndex ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: i === stepIndex ? 600 : 400,
                  display: "flex", gap: "0.5rem",
                  alignItems: "baseline"
                }}>
                  <span style={{
                    color: COLORS[ev.event_type],
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    minWidth: "75px",
                    display: "inline-block",
                    textTransform: "uppercase",
                    fontSize: "0.68rem"
                  }}>
                    [{ev.event_type}]
                  </span>
                  <span>{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Oracle Panel */}
      {events.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <div className="card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <HelpCircle size={16} style={{ color: "var(--accent)" }} />
              <span>Scheduling Oracle Decisions Explainer</span>
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem", color: "var(--accent)" }}
              onClick={handleExplainSchedule}
              disabled={explaining}
            >
              {explaining ? "Consulting Oracle..." : "Explain Decisions"}
            </button>
          </div>
          
          {explanation ? (
            <div style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem 1.5rem",
              maxHeight: "400px",
              overflowY: "auto"
            }}>
              {renderMarkdown(explanation)}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "2rem 0" }}>
              <HelpCircle size={32} style={{ opacity: 0.2, marginBottom: "0.5rem" }} />
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Click "Explain Decisions" to analyze how the scheduler optimized this trace, showing job selection rationale and complexity trade-offs.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
