import { useState, useCallback } from 'react';
import { GitCompare, Play, TrendingUp, Clock, Percent } from 'lucide-react';
import { generateJobs, compareAll } from '../api.js';
import GanttChart from '../components/GanttChart.jsx';
import SummaryTable from '../components/SummaryTable.jsx';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const ALGO_COLORS = {
  greedy: '#059669', bruteforce_optimal: '#dc2626',
  dynamic_programming: '#d97706', priority_queue: '#0891b2', ai_enhanced: '#2563eb',
};
const ALGO_LABELS = {
  greedy: 'Greedy', bruteforce_optimal: 'Brute Force',
  dynamic_programming: 'Dynamic', priority_queue: 'Priority Q', ai_enhanced: 'AI',
};

export default function Compare({ addToast }) {
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nJobs, setNJobs] = useState(6);
  const [maxDl, setMaxDl] = useState(10);
  const [activeGantt, setActiveGantt] = useState(null);

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const gen = await generateJobs(nJobs, maxDl);
      const data = await compareAll(gen.jobs);
      setJobs(gen.jobs);
      setResults(data);
      setActiveGantt(Object.keys(data.results)[0]);
      addToast('Comparison complete!', 'success');
    } catch {
      addToast('Failed — is backend running?', 'error');
    } finally { setLoading(false); }
  }, [nJobs, maxDl, addToast]);

  const profitBar = results
    ? Object.entries(results.summary).map(([k, v]) => ({
        name: ALGO_LABELS[k] || k,
        'Net Profit': v.net_profit, Profit: v.total_profit, Penalty: v.total_penalty,
      })) : [];

  const timeBar = results
    ? Object.entries(results.summary).map(([k, v]) => ({
        name: ALGO_LABELS[k] || k, 'Time (ms)': parseFloat(v.execution_time_ms.toFixed(4)),
      })) : [];

  const radarData = results ? (() => {
    const algos = Object.entries(results.summary);
    const maxP = Math.max(...algos.map(([,v]) => v.net_profit), 1);
    const maxU = Math.max(...algos.map(([,v]) => v.utilization), 1);
    const maxS = Math.max(...algos.map(([,v]) => v.jobs_scheduled), 1);
    const maxT = Math.max(...algos.map(([,v]) => v.execution_time_ms), 0.001);
    return [
      { metric: 'Net Profit',    ...Object.fromEntries(algos.map(([k,v]) => [ALGO_LABELS[k]||k, Math.round(v.net_profit/maxP*100)])) },
      { metric: 'Utilization',   ...Object.fromEntries(algos.map(([k,v]) => [ALGO_LABELS[k]||k, Math.round(v.utilization/maxU*100)])) },
      { metric: 'Jobs Scheduled',...Object.fromEntries(algos.map(([k,v]) => [ALGO_LABELS[k]||k, Math.round(v.jobs_scheduled/maxS*100)])) },
      { metric: 'Speed',         ...Object.fromEntries(algos.map(([k,v]) => [ALGO_LABELS[k]||k, Math.round((1-v.execution_time_ms/maxT)*100)])) },
    ];
  })() : [];

  const algoKeys = results ? Object.keys(results.summary).map(k => ALGO_LABELS[k] || k) : [];

  const badgeCls = a => a==='bruteforce_optimal'?'brute':a==='ai_enhanced'?'ai':a==='priority_queue'?'priority':a==='dynamic_programming'?'dynamic':'greedy';

  return (
    <div>
      <div className="page-header">
        <h2>Algorithm Comparison</h2>
        <p>Run all scheduling algorithms side-by-side and compare every metric visually.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title"><GitCompare size={14} /> Settings</div>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Jobs</label>
            <input className="form-input" type="number" min={1} max={12} value={nJobs} onChange={e => setNJobs(+e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Max Deadline</label>
            <input className="form-input" type="number" min={2} max={50} value={maxDl} onChange={e => setMaxDl(+e.target.value)} />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
              {loading ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}}/> Running…</> : <><Play size={14}/> Generate &amp; Compare</>}
            </button>
          </div>
        </div>
      </div>

      {!results ? (
        <div className="empty-state card"><GitCompare size={48}/><p>Click "Generate &amp; Compare" to begin</p></div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title"><TrendingUp size={14}/> Results Summary</div>
            <SummaryTable summary={results.summary} />
          </div>

          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Profit vs Penalty</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profitBar} margin={{top:4,right:8,left:0,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="Net Profit" fill="#2563eb" radius={[4,4,0,0]}/>
                  <Bar dataKey="Profit" fill="#059669" radius={[4,4,0,0]}/>
                  <Bar dataKey="Penalty" fill="#dc2626" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title"><Clock size={14}/> Execution Time (ms)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timeBar} margin={{top:4,right:8,left:0,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                  <Bar dataKey="Time (ms)" fill="#d97706" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {radarData.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title"><Percent size={14}/> Multi-Metric Radar (normalized 0–100)</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.08)"/>
                  <PolarAngleAxis dataKey="metric" tick={{fill:'var(--text-secondary)',fontSize:12}}/>
                  <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:'var(--text-muted)',fontSize:10}}/>
                  {algoKeys.map((k,i) => {
                    const c = Object.values(ALGO_COLORS)[i]||'#2563eb';
                    return <Radar key={k} name={k} dataKey={k} stroke={c} fill={c} fillOpacity={0.12}/>;
                  })}
                  <Legend wrapperStyle={{fontSize:12}}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <div className="card-title">Gantt Charts</div>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',flexWrap:'wrap'}}>
              {Object.keys(results.results).map(a => (
                <button key={a} onClick={() => setActiveGantt(a)}
                  className={`algo-badge algo-${badgeCls(a)}`}
                  style={{cursor:'pointer',padding:'0.4rem 0.875rem',fontSize:'0.78rem',
                    outline: activeGantt===a ? '2px solid currentColor' : 'none', outlineOffset:2}}>
                  {ALGO_LABELS[a]||a}
                </button>
              ))}
            </div>
            {activeGantt && results.results[activeGantt] && (
              <GanttChart scheduledJobs={results.results[activeGantt].scheduled_jobs} allJobs={jobs}/>
            )}
          </div>
        </>
      )}
    </div>
  );
}
