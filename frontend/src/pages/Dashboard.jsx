import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, Clock, Activity, Brain } from 'lucide-react';
import { generateJobs, compareAll, modelStatus } from '../api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const ALGO_COLORS = {
  greedy: '#059669', bruteforce_optimal: '#dc2626',
  dynamic_programming: '#d97706', priority_queue: '#0891b2', ai_enhanced: '#2563eb',
};
const ALGO_LABELS = {
  greedy: 'Greedy', bruteforce_optimal: 'Brute Force',
  dynamic_programming: 'Dynamic', priority_queue: 'Priority Q', ai_enhanced: 'AI Enhanced',
};

export default function Dashboard({ addToast, modelReady }) {
  const [quickResult, setQuickResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(null);

  // Fetch training history for model card
  useEffect(() => {
    modelStatus().then(s => {
      if (s.training_history) setHistory(s.training_history);
    }).catch(() => {});
  }, [modelReady]);

  const runQuickDemo = useCallback(async () => {
    setLoading(true);
    try {
      const { jobs } = await generateJobs(6, 10, 42);
      const data = await compareAll(jobs);
      setQuickResult(data);
      addToast('Demo complete!', 'success');
    } catch {
      addToast('Backend not reachable — start the FastAPI server first.', 'error');
    } finally { setLoading(false); }
  }, [addToast]);

  const chartData = quickResult
    ? Object.entries(quickResult.summary).map(([algo, s]) => ({
        name: ALGO_LABELS[algo] || algo,
        'Net Profit': s.net_profit,
        'Total Profit': s.total_profit,
        'Penalty': s.total_penalty,
        'Exec (ms)': parseFloat(s.execution_time_ms.toFixed(3)),
        color: ALGO_COLORS[algo] || '#2563eb',
      }))
    : [];

  const bestAlgo = quickResult
    ? Object.entries(quickResult.summary).sort((a, b) => b[1].net_profit - a[1].net_profit)[0]
    : null;

  return (
    <div>
      <div className="page-header">
        <h2>Deadline-Aware Job Scheduler</h2>
        <p>Compare scheduling algorithms — maximize profit, minimize deadline penalties.</p>
      </div>

      {/* Hero Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        {[
          { label: 'Algorithms', value: '5', sub: 'Greedy, DP, BF, PQ, AI', cls: 'stat-profit' },
          { label: 'Scheduling', value: 'Real-time', sub: 'Priority Queue based', cls: 'stat-penalty' },
          { label: 'Objective', value: 'Net Profit', sub: 'Profit − Penalty', cls: 'stat-util' },
          { label: 'Approach', value: 'Compare', sub: 'Side-by-side results', cls: 'stat-net' },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Demo */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card card-glow">
          <div className="card-title"><LayoutDashboard size={14} /> Quick Demo</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
            Generate 6 random jobs and run all five algorithms to see a side-by-side comparison.
          </p>
          <button className="btn btn-primary" onClick={runQuickDemo} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running…</>
              : 'Run Quick Demo'}
          </button>

          {bestAlgo && (
             <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(37,99,235,0.12)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Best Algorithm</div>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                  {ALGO_LABELS[bestAlgo[0]] || bestAlgo[0]}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--emerald)', fontWeight: 600 }}>
                  ₹{bestAlgo[1].net_profit}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {bestAlgo[1].jobs_scheduled} scheduled · {bestAlgo[1].jobs_missed} missed
              </div>
            </div>
          )}
        </div>

        {/* Algorithm Info */}
        <div className="card">
          <div className="card-title"><Activity size={14} /> Algorithm Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { name: 'Greedy', color: '#059669', desc: 'Profit/deadline ratio heuristic. O(n log n). Fast & practical.', badge: 'algo-greedy' },
              { name: 'Brute Force', color: '#dc2626', desc: 'Exhaustive subset search. O(n!). Optimal for small n ≤ 12.', badge: 'algo-brute' },
              { name: 'Dynamic', color: '#d97706', desc: 'Weighted interval DP with binary search. O(n log n).', badge: 'algo-dynamic' },
              { name: 'Priority Queue', color: '#0891b2', desc: 'Heap-based scheduling with dynamic priority ordering. O(n log n).', badge: 'algo-priority' },
              { name: 'AI Enhanced', color: '#2563eb', desc: 'Neural net trained on optimal scheduling decisions.', badge: 'algo-ai' },
            ].map(a => (
              <div key={a.name} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 3, borderRadius: 2, background: a.color, alignSelf: 'stretch', flexShrink: 0 }} />
                <div>
                  <span className={`algo-badge ${a.badge}`} style={{ marginBottom: '0.25rem', display: 'inline-flex' }}>{a.name}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Profit Bar Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title"><TrendingUp size={14} /> Demo Results — Net Profit Comparison</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="Net Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Total Profit" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Penalty" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Card */}
      {history && (
        <div className="card">
          <div className="card-title"><Brain size={14} /> AI Model — Training Summary</div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Final Train Acc', value: `${(history.train_acc.at(-1) * 100).toFixed(1)}%` },
              { label: 'Final Val Acc',   value: `${(history.val_acc.at(-1) * 100).toFixed(1)}%` },
              { label: 'Epochs Run',      value: history.train_loss.length },
              { label: 'Best Val Loss',   value: Math.min(...history.val_loss).toFixed(4) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.15rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
