import { useState } from 'react';
import {
  BookOpen, Layers, Cpu, Brain, Server, Monitor, Wrench,
  ChevronDown, ChevronRight, Zap, GitBranch, Database,
  Network, BarChart3, Box, Code2, Workflow
} from 'lucide-react';

/* ── colour tokens reused across cards ── */
const C = {
  accent: '#2563eb', accentLight: '#3b82f6', cyan: '#0891b2',
  emerald: '#059669', emeraldLight: '#10b981', rose: '#dc2626',
  roseLight: '#ef4444', amber: '#d97706', amberLight: '#f59e0b',
};

/* ── tiny expandable section ── */
function Accordion({ icon: Icon, title, color, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, overflow: 'hidden',
      transition: 'border-color 0.25s, box-shadow 0.25s',
      boxShadow: open ? 'var(--shadow-glow)' : 'var(--shadow-card)',
      borderColor: open ? 'var(--border)' : 'var(--border-subtle)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1.15rem 1.5rem', cursor: 'pointer',
          background: 'none', border: 'none', color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 700,
          letterSpacing: '0.01em', textAlign: 'left',
        }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, border: `1px solid ${color}40`, flexShrink: 0,
        }}>
          <Icon size={16} style={{ color }} />
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        {open ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && (
        <div style={{
          padding: '0 1.5rem 1.5rem',
          animation: 'fadeIn 0.25s ease',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── small pill badge ── */
function Badge({ children, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: 6,
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase', background: `${color}18`,
      border: `1px solid ${color}35`, color,
    }}>
      {children}
    </span>
  );
}

/* ── small complexity tag ── */
function Complexity({ text }) {
  return (
    <code style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
      background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)',
      padding: '0.15rem 0.5rem', borderRadius: 5, color: C.accentLight,
    }}>
      {text}
    </code>
  );
}

/* ── algorithm detail card ── */
function AlgoCard({ name, badge, color, complexity, description, how, proscons }) {
  return (
    <div style={{
      background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '1.25rem', position: 'relative',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        <Badge color={color}>{name}</Badge>
        <Complexity text={complexity} />
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
        {description}
      </p>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong> {how}
      </div>
      {proscons && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {proscons}
        </div>
      )}
    </div>
  );
}

/* ── feature row in the NN diagram ── */
function NNLayer({ label, size, color, extra }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.5rem 0.75rem', background: `${color}10`,
      borderRadius: 8, border: `1px solid ${color}25`,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color }}>{size}</code>
      {extra && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{extra}</span>}
    </div>
  );
}

/* ── tech stack item ── */
function TechItem({ layer, tech, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{layer}</span>
      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color }}>{tech}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   MAIN PAGE COMPONENT
   ────────────────────────────────────────────────────── */
export default function AboutProject() {
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>About This Project</h2>
        <p>A deep-dive into how the Intelligent Deadline-Aware Job Scheduling System is architected and built.</p>
      </div>

      {/* Hero overview */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: '1.75rem' }}>
        {[
          { label: 'Architecture', value: '3-Tier', sub: 'Frontend · API · Engine', icon: Layers, cls: 'stat-net' },
          { label: 'Algorithms', value: '5', sub: 'Greedy · DP · BF · PQ · AI', icon: Cpu, cls: 'stat-profit' },
          { label: 'AI Framework', value: 'PyTorch', sub: 'Deep Neural Network', icon: Brain, cls: 'stat-util' },
          { label: 'Backend', value: 'FastAPI', sub: 'Async REST + Uvicorn', icon: Server, cls: 'stat-penalty' },
          { label: 'Frontend', value: 'React 19', sub: 'Vite 8 + Recharts', icon: Monitor, cls: 'stat-net' },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon size={12} /> {label}
            </div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Accordion Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* ─── 1. SYSTEM ARCHITECTURE ─── */}
        <Accordion icon={Layers} title="System Architecture" color={C.accent} defaultOpen={true}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            The application follows a <strong style={{ color: 'var(--text-primary)' }}>three-tier architecture</strong> separating
            concerns into presentation, API service, and algorithmic engine layers.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem', marginBottom: '1rem',
          }}>
            {[
              { tier: 'Presentation', desc: 'React 19 SPA dashboard with Vite HMR, Recharts visualizations, and Gantt charts.', color: C.cyan, icon: Monitor },
              { tier: 'API Service', desc: 'FastAPI server handling REST endpoints, Pydantic validation, and CORS middleware.', color: C.emerald, icon: Server },
              { tier: 'Core Engine', desc: 'Pure-Python scheduling algorithms + PyTorch neural network for AI-enhanced scheduling.', color: C.accent, icon: Cpu },
            ].map(t => (
              <div key={t.tier} style={{
                background: 'var(--bg-base)', borderRadius: 12, padding: '1rem',
                border: `1px solid ${t.color}25`, borderLeft: `3px solid ${t.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <t.icon size={14} style={{ color: t.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: t.color }}>{t.tier}</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{t.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--bg-base)', borderRadius: 10, padding: '1rem',
            border: '1px solid var(--border-subtle)', fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 2,
          }}>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.3rem', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Flow</div>
            <span style={{ color: C.cyan }}>React UI</span> → <span style={{ color: 'var(--text-muted)' }}>HTTP JSON</span> → <span style={{ color: C.emerald }}>FastAPI</span> → <span style={{ color: C.accent }}>Algorithms / AI Engine</span> → <span style={{ color: C.emerald }}>JSON Response</span> → <span style={{ color: C.cyan }}>Charts & Gantt</span>
          </div>
        </Accordion>

        {/* ─── 2. SCHEDULING ALGORITHMS ─── */}
        <Accordion icon={Cpu} title="Scheduling Algorithms (5 Strategies)" color={C.emerald}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
            All five algorithms solve the same problem: <strong style={{ color: 'var(--text-primary)' }}>maximize net profit</strong> (earned
            profit minus penalties for missed deadlines), given jobs with varying durations, deadlines, arrival times, profits, and penalties.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <AlgoCard
              name="Greedy" color={C.emerald} complexity="O(n log n)"
              description="A fast heuristic that sorts jobs by profit-to-deadline ratio and assigns each to its latest available time slot."
              how="Jobs are sorted descending by profit/deadline. Then each job is assigned to the latest free contiguous block of slots before its deadline. If no slot fits, the job is missed."
              proscons="Extremely fast. May yield sub-optimal results in highly overlapping scenarios."
            />
            <AlgoCard
              name="Brute Force / Optimal" color={C.rose} complexity="O(2ⁿ × n × d)"
              description="Exhaustively evaluates all 2ⁿ subsets of jobs and returns the mathematically optimal schedule. Limited to ≤12 jobs."
              how="Iterates over all 2ⁿ bitmask subsets. Each subset is sorted by deadline and greedily packed into time slots. Upper-bound pruning skips branches that can't beat the current best."
              proscons="Guaranteed global optimum. Exponential time — only practical for small inputs."
            />
            <AlgoCard
              name="Dynamic Programming" color={C.amber} complexity="O(n log n)"
              description="Weighted interval scheduling with binary search. Finds the optimal set of non-overlapping jobs via a 1D DP table."
              how="Jobs are sorted by deadline. For each job, binary search finds the latest compatible (non-overlapping) predecessor. A DP array stores optimal profit at each position: dp[i] = max(dp[i-1], profit[i] + dp[compatible[i]])."
              proscons="Efficient and near-optimal for non-overlapping formulations. Strict non-overlap assumption may miss some valid parallel placements."
            />
            <AlgoCard
              name="Priority Queue" color={C.cyan} complexity="O(n log n)"
              description="Real-time simulation advancing time step-by-step. Arriving jobs enter a heap ranked by a dynamic composite score."
              how="At each time unit, newly arrived jobs enter the priority queue. The composite score is: w₁×profit + w₂×urgency + w₃×penalty. The top-scoring job is dequeued and scheduled."
              proscons="Models real-time dynamic streams perfectly. Quality depends on weight tuning (w₁, w₂, w₃)."
            />
            <AlgoCard
              name="AI Enhanced" color={C.accent} complexity="O(n log n)"
              description="A PyTorch neural network predicts each job's optimal scheduling priority, then jobs are greedily packed by score."
              how="The trained model outputs a probability (0–1) for each job indicating how likely it is to appear in the brute-force optimal schedule. Jobs are sorted by score descending and greedily assigned to time slots."
              proscons="Captures complex feature interactions (competition, density). Runs in O(n log n) but approximates O(2^n) brute-force quality. Requires training data."
            />
          </div>
        </Accordion>

        {/* ─── 3. AI / ML PIPELINE ─── */}
        <Accordion icon={Brain} title="AI / Machine Learning Pipeline" color={C.accent}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            The ML component uses <strong style={{ color: 'var(--text-primary)' }}>supervised learning</strong> to imitate the brute-force optimal
            scheduler. The brute-force algorithm acts as the "teacher", producing ground-truth labels for thousands of synthetic job scenarios.
          </p>

          {/* Phase 1 */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Database size={14} style={{ color: C.amber }} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.amberLight }}>Phase 1 — Synthetic Dataset Generation</span>
            </div>
            <div style={{
              background: 'var(--bg-base)', borderRadius: 10, padding: '1rem',
              border: '1px solid var(--border-subtle)', fontSize: '0.8rem',
              color: 'var(--text-secondary)', lineHeight: 1.8,
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                Thousands of random job scenarios are generated. For each scenario, the <strong style={{ color: C.roseLight }}>brute-force optimal scheduler</strong> computes
                the mathematically perfect schedule. Each job is then labeled <code style={{ color: C.emeraldLight }}>1</code> (scheduled) or <code style={{ color: C.roseLight }}>0</code> (missed).
              </p>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                10 Extracted Features per Job
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
                {[
                  ['deadline_norm', 'Normalized deadline'],
                  ['duration_norm', 'Normalized processing time'],
                  ['profit_norm', 'Normalized profit value'],
                  ['penalty_norm', 'Normalized penalty cost'],
                  ['arrival_norm', 'Normalized arrival time'],
                  ['profit_penalty_ratio', 'Profit / penalty (capped)'],
                  ['urgency', '1 / (1 + slack)'],
                  ['slack_ratio', 'slack / max_deadline'],
                  ['density_norm', 'profit / duration (normed)'],
                  ['competition', 'Overlapping jobs ratio'],
                ].map(([feat, desc]) => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: C.accentLight }}>{feat}</code>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>— {desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Network size={14} style={{ color: C.accent }} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.accentLight }}>Phase 2 — Neural Network Architecture</span>
            </div>
            <div style={{
              background: 'var(--bg-base)', borderRadius: 10, padding: '1rem',
              border: '1px solid var(--border-subtle)',
            }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.7 }}>
                Two architectures are available. <strong style={{ color: 'var(--text-secondary)' }}>SchedulerNet V1</strong> (default MLP)
                and <strong style={{ color: 'var(--text-secondary)' }}>SchedulerNet V2</strong> (ResNet-style with residual connections).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <NNLayer label="Input Layer" size="10 features" color={C.cyan} />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <NNLayer label="Hidden Layer 1" size="128 units" color={C.accent} extra="BatchNorm → ReLU → Dropout(0.3)" />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <NNLayer label="Hidden Layer 2" size="64 units" color={C.accent} extra="BatchNorm → ReLU → Dropout(0.3)" />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <NNLayer label="Hidden Layer 3" size="32 units" color={C.accent} extra="BatchNorm → ReLU → Dropout(0.15)" />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <NNLayer label="Output Layer" size="1 unit" color={C.emerald} extra="Sigmoid → probability [0, 1]" />
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Workflow size={14} style={{ color: C.emerald }} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.emeraldLight }}>Phase 3 — Training Pipeline</span>
            </div>
            <div style={{
              background: 'var(--bg-base)', borderRadius: 10, padding: '1rem',
              border: '1px solid var(--border-subtle)', fontSize: '0.8rem',
              color: 'var(--text-secondary)', lineHeight: 1.8,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Loss Function', value: 'Binary Cross-Entropy (BCELoss)', detail: 'Standard for binary classification (schedule or miss).' },
                  { label: 'Optimizer', value: 'Adam (lr=0.001, wd=1e-4)', detail: 'Adaptive learning rate with L2 weight decay regularization.' },
                  { label: 'LR Scheduler', value: 'ReduceLROnPlateau', detail: 'Halves learning rate if validation loss plateaus for 5 epochs.' },
                  { label: 'Early Stopping', value: 'Patience = 15 epochs', detail: 'Training halts if no validation improvement for 15 epochs.' },
                  { label: 'Data Split', value: '80% Train / 20% Validation', detail: 'Random split with PyTorch DataLoader shuffling.' },
                  { label: 'Initialization', value: 'Xavier Uniform', detail: 'Weight initialization for better convergence with ReLU.' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '0.75rem',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: C.accentLight, margin: '0.2rem 0' }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        {/* ─── 4. BACKEND API ─── */}
        <Accordion icon={Server} title="FastAPI Backend & REST API" color={C.emerald}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            The backend is built on <strong style={{ color: 'var(--text-primary)' }}>FastAPI</strong> with <strong style={{ color: 'var(--text-primary)' }}>Uvicorn</strong> as
            the ASGI server. It exposes validated REST endpoints with auto-generated Swagger documentation.
          </p>

          {/* Endpoint table */}
          <div style={{
            background: 'var(--bg-base)', borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Endpoint</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['POST', '/api/generate-jobs', 'Generate a random job set'],
                  ['POST', '/api/schedule/greedy', 'Run greedy algorithm'],
                  ['POST', '/api/schedule/bruteforce', 'Run brute-force (≤12 jobs)'],
                  ['POST', '/api/schedule/dynamic', 'Run DP algorithm'],
                  ['POST', '/api/schedule/priority-queue', 'Run priority queue'],
                  ['POST', '/api/schedule/ai', 'Run AI-enhanced scheduling'],
                  ['POST', '/api/compare', 'Run all & compare'],
                  ['POST', '/api/train', 'Generate data & train AI'],
                  ['GET', '/api/model-status', 'Check AI model status'],
                  ['POST', '/api/analysis/full', 'Run all performance analyses'],
                ].map(([method, endpoint, desc], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.55rem 1rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700,
                        color: method === 'GET' ? C.cyan : C.emeraldLight,
                        background: method === 'GET' ? `${C.cyan}15` : `${C.emerald}15`,
                        padding: '0.15rem 0.4rem', borderRadius: 4,
                      }}>
                        {method}
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {endpoint}
                    </td>
                    <td style={{ padding: '0.55rem 1rem', color: 'var(--text-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(37,99,235,0.04)',
            borderRadius: 8, border: '1px solid var(--border)',
            fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            <strong style={{ color: C.accentLight }}>Key features:</strong> Pydantic request validation, CORS middleware for cross-origin access,
            auto-loading of AI model at startup, in-process training endpoint, and static file serving for the production build.
          </div>
        </Accordion>

        {/* ─── 5. JOB SCHEMA ─── */}
        <Accordion icon={Box} title="Job Data Schema" color={C.amber}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Every job submitted to the system follows a strict schema validated by Pydantic on the backend.
          </p>
          <div style={{
            background: 'var(--bg-base)', borderRadius: 10, padding: '1.25rem',
            border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem', lineHeight: 2, color: 'var(--text-secondary)',
          }}>
            <div style={{ color: 'var(--text-muted)' }}>{'{'}</div>
            {[
              ['"id"', '1', 'Unique job identifier'],
              ['"deadline"', '8', 'Must complete by this time (≥1)'],
              ['"duration"', '2', 'Processing time needed (≥1)'],
              ['"profit"', '75.0', 'Reward if completed on time (>0)'],
              ['"penalty"', '20.0', 'Cost if deadline is missed (≥0)'],
              ['"arrival_time"', '0', 'Earliest start time (≥0)'],
            ].map(([key, val, desc]) => (
              <div key={key} style={{ paddingLeft: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: C.accentLight }}>{key}</span>
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <span style={{ color: C.emeraldLight }}>{val}</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.7rem' }}>// {desc}</span>
              </div>
            ))}
            <div style={{ color: 'var(--text-muted)' }}>{'}'}</div>
          </div>
        </Accordion>

        {/* ─── 6. FRONTEND ─── */}
        <Accordion icon={Monitor} title="Frontend Dashboard & Pages" color={C.cyan}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            The frontend is a single-page application built with <strong style={{ color: 'var(--text-primary)' }}>React 19</strong> and <strong style={{ color: 'var(--text-primary)' }}>Vite 8</strong>,
            using <strong style={{ color: 'var(--text-primary)' }}>Recharts</strong> for data visualization and <strong style={{ color: 'var(--text-primary)' }}>Lucide</strong> for icons.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {[
              { name: 'Dashboard', desc: 'Overview portal with real-time AI model status and algorithm formulas.', color: C.accent, icon: BarChart3 },
              { name: 'Scheduler', desc: 'Interactive job editor — add, delete, or generate random jobs. Run any algorithm and visualize results on a Gantt chart.', color: C.emerald, icon: Cpu },
              { name: 'Compare', desc: 'Runs all algorithms concurrently on the same job set. Displays a side-by-side summary table of net profit, speed, and utilization.', color: C.amber, icon: GitBranch },
              { name: 'Analytics', desc: 'Training curves for loss and accuracy. Visualize how the AI model learned over epochs.', color: C.cyan, icon: BarChart3 },
              { name: 'Performance', desc: 'Monte-Carlo profiling: scalability curves, profit comparisons, utilization, and penalty analysis across all algorithms with CSV data export.', color: C.rose, icon: Zap },
              { name: 'Train AI', desc: 'Configure hyperparameters (epochs, samples, batches) and trigger model training directly from the browser with a live training progress bar.', color: C.accent, icon: Brain },
            ].map(p => (
              <div key={p.name} style={{
                background: 'var(--bg-base)', borderRadius: 12, padding: '1rem',
                border: `1px solid ${p.color}20`, borderTop: `2px solid ${p.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <p.icon size={14} style={{ color: p.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{p.name}</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </Accordion>

        {/* ─── 7. TECH STACK ─── */}
        <Accordion icon={Wrench} title="Technology Stack" color={C.amber}>
          <div style={{
            background: 'var(--bg-base)', borderRadius: 10, padding: '0.5rem 1.25rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <TechItem layer="Backend" tech="Python 3.11, FastAPI, Uvicorn" color={C.emeraldLight} />
            <TechItem layer="Algorithms" tech="Pure Python (stdlib only)" color={C.amberLight} />
            <TechItem layer="AI / ML" tech="PyTorch 2.x" color={C.accentLight} />
            <TechItem layer="Frontend" tech="React 19, Vite 8, Recharts, Lucide" color={C.cyan} />
            <TechItem layer="Data" tech="CSV (training), JSON (metadata)" color={C.accentLight} />
            <TechItem layer="Dev Tools" tech="npm, pip, uvicorn --reload" color='var(--text-secondary)' />
          </div>
        </Accordion>

        {/* ─── 8. PROJECT FILES ─── */}
        <Accordion icon={Code2} title="Project File Structure" color={C.accentLight}>
          <div style={{
            background: 'var(--bg-base)', borderRadius: 10, padding: '1.25rem',
            border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)',
            fontSize: '0.73rem', lineHeight: 2, color: 'var(--text-muted)',
            whiteSpace: 'pre',
          }}>
{`DAA-EL/
├── app.py                        `}<span style={{ color: C.emeraldLight }}>← FastAPI backend</span>{`
├── requirements.txt              `}<span style={{ color: 'var(--text-muted)' }}>← Python deps</span>{`
├── run_training.py               `}<span style={{ color: C.accentLight }}>← AI training runner</span>{`
├── start.bat / train_ai.bat      `}<span style={{ color: 'var(--text-muted)' }}>← Windows launch scripts</span>{`
│
├── algorithms/
│   ├── greedy_scheduler.py       `}<span style={{ color: C.emeraldLight }}>← O(n log n)</span>{`
│   ├── bruteforce_scheduler.py   `}<span style={{ color: C.roseLight }}>← O(2ⁿ) optimal</span>{`
│   ├── dynamic_scheduler.py      `}<span style={{ color: C.amberLight }}>← Weighted DP</span>{`
│   └── priority_queue_manager.py `}<span style={{ color: C.cyan }}>← Real-time PQ</span>{`
│
├── ai_model/
│   ├── model.py                  `}<span style={{ color: C.accentLight }}>← SchedulerNet V1 & V2</span>{`
│   ├── dataset_generator.py      `}<span style={{ color: C.accentLight }}>← Synthetic data gen</span>{`
│   ├── train_model.py            `}<span style={{ color: C.accentLight }}>← Training pipeline</span>{`
│   ├── predictor.py              `}<span style={{ color: C.accentLight }}>← Live inference</span>{`
│   └── saved_models/             `}<span style={{ color: 'var(--text-muted)' }}>← .pth checkpoints</span>{`
│
├── analysis/
│   └── performance_analyzer.py   `}<span style={{ color: C.accentLight }}>← Monte-Carlo profiling</span>{`
│
├── data/
│   ├── training_data.csv         `}<span style={{ color: 'var(--text-muted)' }}>← Generated labels</span>{`
│   └── dataset_meta.json         `}<span style={{ color: 'var(--text-muted)' }}>← Dataset metadata</span>{`
│
└── frontend/src/
    ├── App.jsx                   `}<span style={{ color: C.cyan }}>← Layout & routing</span>{`
    ├── api.js                    `}<span style={{ color: C.cyan }}>← HTTP client</span>{`
    ├── pages/                    `}<span style={{ color: C.cyan }}>← 7 page components</span>{`
    └── components/               `}<span style={{ color: C.cyan }}>← GanttChart, SummaryTable</span>
          </div>
        </Accordion>

      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem', padding: '1.5rem', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(8,145,178,0.03))',
        border: '1px solid var(--border)', textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Built as a <strong style={{ color: 'var(--text-primary)' }}>Design & Analysis of Algorithms</strong> experiential learning project.
          Combines classical algorithmic paradigms — greedy, dynamic programming, brute-force, priority queues — with
          modern deep learning to solve real-world scheduling optimization under deadline constraints.
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          DAA-EL · Intelligent Deadline-Aware Job Scheduling System
        </p>
      </div>

      {/* fadeIn animation style */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
