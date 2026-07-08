import { useState, useCallback } from 'react';
import { Activity, Play, Target, Timer, Gauge, AlertTriangle, TrendingUp, Zap, HardDrive, Download } from 'lucide-react';
import { analyzeAll } from '../api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#059669','#dc2626','#d97706','#0891b2','#2563eb'];
const ALGO_LABELS = {
  greedy: 'Greedy', bruteforce: 'Brute Force', bruteforce_optimal: 'Brute Force',
  dynamic: 'Dynamic', dynamic_programming: 'Dynamic',
  priority_queue: 'Priority Q', ai_enhanced: 'AI Enhanced',
};
const label = k => ALGO_LABELS[k] || k;

export default function PerformanceAnalysis({ addToast, modelReady }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nTests, setNTests] = useState(50);
  const [nJobs, setNJobs] = useState(6);

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyzeAll({ n_tests: nTests, n_jobs: nJobs, max_deadline: 10 });
      setData(res);
      addToast('Analysis complete!', 'success');
    } catch {
      addToast('Analysis failed -- is the backend running?', 'error');
    } finally { setLoading(false); }
  }, [nTests, nJobs, addToast]);

  const handleExportCSV = useCallback(() => {
    if (!data || !data.large_scale || !data.large_scale.large_scale) {
      addToast('No large scale data available to export.', 'error');
      return;
    }
    const ls = data.large_scale.large_scale;
    if (ls.length === 0) return;
    
    const headers = Object.keys(ls[0]).join(',');
    const rows = ls.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analysis_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Results exported to CSV!', 'success');
  }, [data, addToast]);

  // Build chart data from analysis results
  const scalabilityData = data?.scalability?.scalability?.map((row, idx, arr) => {
    const r = { jobs: row.n_jobs };
    for (const [k, v] of Object.entries(row)) {
      if (k.endsWith('_avg_ms')) r[label(k.replace('_avg_ms', ''))] = v;
    }

    // Calculate theoretical baseline curves anchored to the first data point
    if (arr[0] && arr[0].n_jobs > 0) {
      const n0 = arr[0].n_jobs;

      const greedy0 = arr[0].greedy_avg_ms || 0.001;
      const c_n2 = greedy0 / (n0 * n0);
      r['Theoretical O(N²)'] = +(c_n2 * (row.n_jobs * row.n_jobs)).toFixed(4);

      const dp0 = arr[0].dynamic_avg_ms || 0.001;
      const logN0 = Math.log2(n0) || 1;
      const c_nlogn = dp0 / (n0 * logN0);
      r['Theoretical O(N log N)'] = +(c_nlogn * (row.n_jobs * Math.max(Math.log2(row.n_jobs), 1))).toFixed(4);
    }
    return r;
  }) || [];

  const spaceData = data?.space_complexity?.space_complexity?.map(row => {
    const r = { jobs: row.n_jobs };
    for (const [k, v] of Object.entries(row)) {
      if (k.endsWith('_peak_bytes')) r[label(k.replace('_peak_bytes', ''))] = v;
    }
    return r;
  }) || [];

  const largeScaleData = data?.large_scale?.large_scale?.map(row => {
    const r = { jobs: row.n_jobs };
    for (const [k, v] of Object.entries(row)) {
      if (k.endsWith('_avg_ms')) r[label(k.replace('_avg_ms', '')) + ' Time (ms)'] = v;
      if (k.endsWith('_avg_profit')) r[label(k.replace('_avg_profit', '')) + ' Profit'] = v;
    }
    return r;
  }) || [];

  const utilData = data?.utilization?.utilization
    ? Object.entries(data.utilization.utilization).map(([k, v], i) => ({
        name: label(k), avg: +(v.avg_utilization * 100).toFixed(1),
        min: +(v.min_utilization * 100).toFixed(1), max: +(v.max_utilization * 100).toFixed(1),
      }))
    : [];

  const penaltyData = data?.penalty?.penalty_analysis
    ? Object.entries(data.penalty.penalty_analysis).map(([k, v], i) => ({
        name: label(k), 'Avg Penalty': v.avg_penalty, 'Max Penalty': v.max_penalty,
        'Avg Missed': v.avg_missed_jobs, 'Miss Rate': +(v.avg_miss_rate * 100).toFixed(1),
      }))
    : [];

  const acc = data?.accuracy;
  const gvo = data?.greedy_vs_optimal;

  const accRadar = acc ? [
    { metric: 'Precision',  score: +(acc.precision * 100).toFixed(1) },
    { metric: 'Recall',     score: +(acc.recall * 100).toFixed(1) },
    { metric: 'F1 Score',   score: +(acc.f1_score * 100).toFixed(1) },
    { metric: 'Exact Match', score: +(acc.exact_match_accuracy * 100).toFixed(1) },
    { metric: 'Job Acc',    score: +(acc.job_level_accuracy * 100).toFixed(1) },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <h2>Performance Analysis</h2>
        <p>Deep-dive into algorithm accuracy, scalability, utilization, and penalty metrics.</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title"><Activity size={14} /> Analysis Configuration</div>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="form-group" style={{ flex: '0 0 160px' }}>
            <label className="form-label">Test Iterations</label>
            <input className="form-input" type="number" min={5} max={200} value={nTests}
              onChange={e => setNTests(+e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Jobs per Test</label>
            <input className="form-input" type="number" min={3} max={10} value={nJobs}
              onChange={e => setNJobs(+e.target.value)} />
          </div>
          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing ({nTests} tests)...</>
                : <><Play size={14} /> Run Full Analysis</>}
            </button>
            {data && (
              <button className="btn btn-secondary" onClick={handleExportCSV}>
                <Download size={14} /> Export Results (CSV)
              </button>
            )}
          </div>
        </div>
        {!modelReady && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--amber-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={13} /> AI model not trained -- accuracy analysis will be skipped.
          </div>
        )}
      </div>

      {!data ? (
        <div className="empty-state card"><Activity size={48} /><p>Click "Run Full Analysis" to begin</p></div>
      ) : (
        <>
          {/* ── AI Accuracy Section ───────────────────────── */}
          {acc && !acc.error && (
            <>
              <div className="card card-glow" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title"><Target size={14} /> AI Prediction Accuracy</div>
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '1.5rem' }}>
                  {[
                    { l: 'Job Accuracy',  v: (acc.job_level_accuracy * 100).toFixed(1) + '%', c: 'stat-profit' },
                    { l: 'Exact Match',   v: (acc.exact_match_accuracy * 100).toFixed(1) + '%', c: 'stat-net' },
                    { l: 'Precision',     v: (acc.precision * 100).toFixed(1) + '%', c: 'stat-util' },
                    { l: 'Recall',        v: (acc.recall * 100).toFixed(1) + '%', c: 'stat-penalty' },
                    { l: 'F1 Score',      v: (acc.f1_score * 100).toFixed(1) + '%', c: 'stat-net' },
                    { l: 'Avg Profit Gap', v: '₹' + acc.avg_profit_gap, c: 'stat-penalty' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className={`stat-card ${c}`}>
                      <div className="stat-label">{l}</div>
                      <div className="stat-value" style={{ fontSize: '1.3rem' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Radar */}
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={accRadar}>
                    <PolarGrid stroke="rgba(0,0,0,0.08)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ── Greedy vs Optimal ─────────────────────────── */}
          {gvo && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title"><TrendingUp size={14} /> Greedy vs Brute-Force Optimal</div>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {[
                  { l: 'Avg Optimality Ratio', v: (gvo.avg_optimality_ratio * 100).toFixed(1) + '%' },
                  { l: 'Min Ratio (worst)',    v: (gvo.min_optimality_ratio * 100).toFixed(1) + '%' },
                  { l: 'Greedy = Optimal',     v: (gvo.greedy_equals_optimal_pct * 100).toFixed(1) + '%' },
                  { l: 'Avg Profit Gap',       v: '₹' + gvo.avg_profit_gap },
                  { l: 'Max Profit Gap',       v: '₹' + gvo.max_profit_gap },
                ].map(({ l, v }) => (
                  <div key={l} className="stat-card stat-net">
                    <div className="stat-label">{l}</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Scalability Chart ─────────────────────────── */}
          {scalabilityData.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title"><Timer size={14} /> Execution Time Scalability</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={scalabilityData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="jobs" label={{ value: 'Number of Jobs', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {['Greedy','Dynamic','Priority Q','Brute Force','AI Enhanced'].map((name, i) => (
                    scalabilityData[0]?.[name] !== undefined &&
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                  <Line type="monotone" dataKey="Theoretical O(N²)" stroke="#94a3b8" strokeDasharray="6 3" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Theoretical O(N log N)" stroke="#cbd5e1" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Note: Brute-force time grows exponentially (O(n!)). Dashed grey lines show theoretical O(N²) and O(N log N) baselines anchored to the first data point.
              </div>
            </div>
          )}

          {/* ── Space Complexity Chart ─────────────────────── */}
          {spaceData.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title"><HardDrive size={14} /> Peak Memory — Space Complexity</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={spaceData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="jobs" label={{ value: 'Number of Jobs', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: 'Peak Memory (bytes)', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {['Greedy','Dynamic','Priority Q','Brute Force','AI Enhanced'].map((name, i) => (
                    spaceData[0]?.[name] !== undefined &&
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Peak memory allocation per algorithm measured via Python tracemalloc. DP typically uses more memory due to its tabular memoization.
              </div>
            </div>
          )}

          {/* ── Large-Scale Comparison ─────────────────────── */}
          {largeScaleData.length > 0 && (
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="card">
                <div className="card-title"><Timer size={14} /> Execution Time at Scale (ms)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={largeScaleData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jobs" label={{ value: 'Number of Jobs (N)', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {['Greedy Time (ms)','Dynamic Time (ms)','Priority Q Time (ms)','AI Enhanced Time (ms)'].map((name, i) => (
                      largeScaleData[0]?.[name] !== undefined &&
                      <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="card-title"><TrendingUp size={14} /> Net Profit at Scale (₹)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={largeScaleData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jobs" label={{ value: 'Number of Jobs (N)', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {['Greedy Profit','Dynamic Profit','Priority Q Profit','AI Enhanced Profit'].map((name, i) => (
                      largeScaleData[0]?.[name] !== undefined &&
                      <Bar key={name} dataKey={name} fill={COLORS[i]} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Utilization & Penalty Row ──────────────────── */}
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            {/* Utilization Bar Chart */}
            {utilData.length > 0 && (
              <div className="card">
                <div className="card-title"><Gauge size={14} /> System Utilization (%)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={utilData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avg" name="Average" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="max" name="Maximum" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="min" name="Minimum" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Penalty Analysis */}
            {penaltyData.length > 0 && (
              <div className="card">
                <div className="card-title"><AlertTriangle size={14} /> Penalty Analysis</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={penaltyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Avg Penalty" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Max Penalty" fill="#d97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Avg Missed" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Penalty Miss Rate Pie ─────────────────────── */}
          {penaltyData.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title"><Zap size={14} /> Average Miss Rate by Algorithm</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', padding: '1rem 0' }}>
                {penaltyData.map((d, i) => (
                  <div key={d.name} style={{ textAlign: 'center' }}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={[{ v: d['Miss Rate'] }, { v: 100 - d['Miss Rate'] }]}
                          dataKey="v" innerRadius={30} outerRadius={45} startAngle={90} endAngle={-270}>
                          <Cell fill={COLORS[i % COLORS.length]} />
                          <Cell fill="rgba(0,0,0,0.04)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: COLORS[i % COLORS.length] }}>
                      {d['Miss Rate']}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{d.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="card">
            <div className="card-title"><Activity size={14} /> Analysis Summary</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <p><strong>Tests run:</strong> {nTests} iterations with {nJobs} jobs each</p>
              {acc && !acc.error && (
                <p><strong>AI Accuracy:</strong> The neural network achieves {(acc.job_level_accuracy*100).toFixed(1)}% job-level accuracy
                and {(acc.exact_match_accuracy*100).toFixed(1)}% exact-match accuracy compared to brute-force optimal solutions.</p>
              )}
              {gvo && (
                <p><strong>Greedy vs Optimal:</strong> The greedy heuristic achieves {(gvo.avg_optimality_ratio*100).toFixed(1)}% of
                optimal profit on average, matching the optimal solution {(gvo.greedy_equals_optimal_pct*100).toFixed(1)}% of the time.</p>
              )}
              <p><strong>Scalability:</strong> Greedy and DP run in sub-millisecond time even at 12 jobs,
              while brute-force execution time grows exponentially, demonstrating why AI-based scheduling is essential for larger workloads.</p>
              <p><strong>Space Complexity:</strong> Peak memory profiling shows that DP uses more memory due to its
              tabular memoization structure, while Greedy and Priority Queue remain lightweight with O(N) space.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
