import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, Clock, Activity, Brain } from 'lucide-react';
import { modelStatus } from '../api.js';

const ALGO_COLORS = {
  greedy: '#059669', bruteforce_optimal: '#dc2626',
  dynamic_programming: '#d97706', priority_queue: '#0891b2', ai_enhanced: '#2563eb',
};
const ALGO_LABELS = {
  greedy: 'Greedy', bruteforce_optimal: 'Brute Force',
  dynamic_programming: 'Dynamic', priority_queue: 'Priority Q', ai_enhanced: 'AI Enhanced',
};

export default function Dashboard({ addToast, modelReady }) {
  const [history, setHistory] = useState(null);

  // Fetch training history for model card
  useEffect(() => {
    const fetchStatus = () => {
      modelStatus().then(s => {
        if (s.training_history) setHistory(s.training_history);
      }).catch(() => {});
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

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
          { label: 'Evaluation', value: 'Trade-offs', sub: 'Speed vs. Optimality', cls: 'stat-penalty' },
          { label: 'Objective', value: 'Net Profit', sub: 'Profit − Penalty', cls: 'stat-util' },
          { label: 'Approach', value: 'Comparative', sub: 'Scale and Accuracy Analysis', cls: 'stat-net' },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title"><Activity size={14} /> Algorithm Overview & Formulas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { name: 'Greedy', color: '#059669', desc: 'Sorts by heuristic H = Profit / max(Deadline, 1). Fast O(n log n) execution but suboptimal for tight overlaps.', badge: 'algo-greedy' },
              { name: 'Brute Force', color: '#dc2626', desc: 'Exhaustively evaluates 2^n subsets. Guarantees 100% optimal Max Net Profit. Used as AI training ground-truth.', badge: 'algo-brute' },
              { name: 'Dynamic', color: '#d97706', desc: 'Weighted interval DP. DP[i] = max(DP[i-1] - penalty, profit_i + DP[p]). O(n log n) scaling.', badge: 'algo-dynamic' },
              { name: 'Priority Queue', color: '#0891b2', desc: 'Dynamic heap ordering: P = 0.4(Profit) + 0.35(1/Slack) + 0.25(Penalty). Recalculates on each time step.', badge: 'algo-priority' },
              { name: 'AI Enhanced', color: '#2563eb', desc: 'Residual Neural Network (PyTorch) predicting P(Schedule_i | 22 features) trained on Brute-Force optimal labels.', badge: 'algo-ai' },
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
