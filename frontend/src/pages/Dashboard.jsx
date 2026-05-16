import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, Clock, Zap, Activity, Brain, ChevronRight } from 'lucide-react';
import { generateJobs, compareAll, modelStatus } from '../api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const ALGO_COLORS = {
  greedy: '#10b981', bruteforce_optimal: '#f43f5e',
  dynamic_programming: '#f59e0b', priority_queue: '#06b6d4', ai_enhanced: '#a855f7',
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
        color: ALGO_COLORS[algo] || '#6366f1',
      }))
    : [];

  const bestAlgo = quickResult
    ? Object.entries(quickResult.summary).sort((a, b) => b[1].net_profit - a[1].net_profit)[0]
    : null;

  return (
    <div>
      <div className="page-header">
        <h2>Intelligent Job Scheduler</h2>
        <p>DAA + Machine Learning — maximize profit, minimize deadline penalties.</p>
      </div>

      {/* Hero Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        {[
          { label: 'Algorithms', value: '4+', sub: 'Greedy, DP, BF, AI', icon: Zap, cls: 'stat-profit' },
          { label: 'AI Model', value: modelReady ? 'Ready' : 'Untrained', sub: modelReady ? 'PyTorch Neural Net' : 'Go to Train AI', icon: Brain, cls: 'stat-net' },
          { label: 'Objective', value: 'Net Profit', sub: 'Profit − Penalty', icon: TrendingUp, cls: 'stat-util' },
          { label: 'Scheduling', value: 'Real-time', sub: 'Priority Queue', icon: Activity, cls: 'stat-penalty' },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon size={12} /> {label}
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Demo */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card card-glow">
          <div className="card-title"><Zap size={14} /> Quick Demo</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
            Generate 6 random jobs with deadline ≤ 10 and run all four algorithms instantly to see a side-by-side comparison.
          </p>
          <button className="btn btn-primary" onClick={runQuickDemo} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Running…</>
              : <><Zap size={14} /> Run Demo</>}
          </button>

          {bestAlgo && (
            <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Best Algorithm</div>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                  {ALGO_LABELS[bestAlgo[0]] || bestAlgo[0]}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--emerald-light)', fontWeight: 700 }}>
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
              { name: 'Greedy', color: '#10b981', desc: 'Profit/deadline ratio heuristic. O(n log n). Fast & practical.', badge: 'algo-greedy' },
              { name: 'Brute Force', color: '#f43f5e', desc: 'Exhaustive subset search. O(n!). Optimal for small n ≤ 12.', badge: 'algo-brute' },
              { name: 'Dynamic', color: '#f59e0b', desc: 'Weighted interval DP with binary search. O(n log n).', badge: 'algo-dynamic' },
              { name: 'AI Enhanced', color: '#a855f7', desc: 'PyTorch neural net trained on optimal decisions.', badge: 'algo-ai' },
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
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="Net Profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Total Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Penalty" fill="#f43f5e" radius={[4, 4, 0, 0]} />
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-light)', marginTop: '0.2rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
