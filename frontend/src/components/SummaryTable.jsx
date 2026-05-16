const ALGO_LABELS = {
  greedy: 'Greedy', bruteforce_optimal: 'Brute Force',
  dynamic_programming: 'Dynamic', priority_queue: 'Priority Q', ai_enhanced: 'AI Enhanced',
};
const BADGE_CLS = {
  greedy: 'algo-greedy', bruteforce_optimal: 'algo-brute',
  dynamic_programming: 'algo-dynamic', priority_queue: 'algo-priority', ai_enhanced: 'algo-ai',
};

export default function SummaryTable({ summary }) {
  if (!summary || !Object.keys(summary).length) return null;

  const entries = Object.entries(summary);
  const bestNet = Math.max(...entries.map(([, v]) => v.net_profit));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="job-table">
        <thead>
          <tr>
            <th>Algorithm</th><th>Net Profit</th><th>Profit</th>
            <th>Penalty</th><th>Scheduled</th><th>Missed</th>
            <th>Utilization</th><th>Time (ms)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([algo, s]) => (
            <tr key={algo} style={s.net_profit === bestNet ? { background: 'rgba(99,102,241,0.06)' } : {}}>
              <td>
                <span className={`algo-badge ${BADGE_CLS[algo] || ''}`}>
                  {ALGO_LABELS[algo] || algo}
                </span>
                {s.net_profit === bestNet && (
                  <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--amber-light)' }}>★ best</span>
                )}
              </td>
              <td className="mono" style={{ fontWeight: 700, color: s.net_profit >= 0 ? 'var(--emerald-light)' : 'var(--rose-light)' }}>
                ₹{s.net_profit}
              </td>
              <td className="mono">₹{s.total_profit}</td>
              <td className="mono" style={{ color: 'var(--rose-light)' }}>₹{s.total_penalty}</td>
              <td className="mono">{s.jobs_scheduled}</td>
              <td className="mono">{s.jobs_missed}</td>
              <td className="mono">{(s.utilization * 100).toFixed(1)}%</td>
              <td className="mono">{s.execution_time_ms.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
