import { useState, useCallback } from 'react';
import { PlusCircle, Shuffle, Play, Trash2, Clock, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { generateJobs, compareAll } from '../api.js';
import GanttChart from '../components/GanttChart.jsx';
import SummaryTable from '../components/SummaryTable.jsx';

const COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#06b6d4','#a855f7','#f97316','#84cc16'];

const emptyJob = () => ({ id: Date.now(), deadline: 8, duration: 2, profit: 50, penalty: 20, arrival_time: 0 });

export default function Scheduler({ addToast, modelReady }) {
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(6);
  const [genDeadline, setGenDeadline] = useState(10);
  const [selectedAlgo, setSelectedAlgo] = useState('greedy');

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateJobs(genCount, genDeadline);
      setJobs(data.jobs);
      setResults(null);
      addToast(`Generated ${data.count} jobs`, 'success');
    } catch {
      addToast('Backend not reachable', 'error');
    } finally { setLoading(false); }
  }, [genCount, genDeadline, addToast]);

  const handleAddJob = () => {
    const j = emptyJob();
    j.id = jobs.length > 0 ? Math.max(...jobs.map(x => x.id)) + 1 : 1;
    setJobs(prev => [...prev, j]);
  };

  const handleUpdateJob = (idx, field, value) => {
    setJobs(prev => prev.map((j, i) => i === idx ? { ...j, [field]: parseFloat(value) || 0 } : j));
  };

  const handleDeleteJob = (idx) => setJobs(prev => prev.filter((_, i) => i !== idx));

  const handleRun = useCallback(async () => {
    if (!jobs.length) { addToast('Add some jobs first', 'info'); return; }
    setLoading(true);
    try {
      const data = await compareAll(jobs);
      setResults(data);
      addToast('Scheduling complete!', 'success');
    } catch {
      addToast('Scheduling failed — is backend running?', 'error');
    } finally { setLoading(false); }
  }, [jobs, addToast]);

  const algos = results ? Object.keys(results.results) : [];
  const activeResult = results?.results?.[selectedAlgo];

  return (
    <div>
      <div className="page-header">
        <h2>Job Scheduler</h2>
        <p>Define jobs, generate random sets, and run all scheduling algorithms.</p>
      </div>

      {/* Generation Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title"><Shuffle size={14} /> Quick Generate</div>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Number of Jobs</label>
            <input className="form-input" type="number" min={1} max={12} value={genCount}
              onChange={e => setGenCount(+e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Max Deadline</label>
            <input className="form-input" type="number" min={2} max={50} value={genDeadline}
              onChange={e => setGenDeadline(+e.target.value)} />
          </div>
          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              <Shuffle size={14} /> Generate
            </button>
            <button className="btn btn-ghost" onClick={handleAddJob}>
              <PlusCircle size={14} /> Add Job
            </button>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      {jobs.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ margin: 0 }}><Clock size={14} /> Jobs ({jobs.length})</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost" onClick={() => { setJobs([]); setResults(null); }}>
                <Trash2 size={14} /> Clear
              </button>
              <button className="btn btn-emerald" onClick={handleRun} disabled={loading || !jobs.length}>
                <Play size={14} /> {loading ? 'Running…' : 'Run All Algorithms'}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="job-table">
              <thead>
                <tr>
                  <th>#</th><th>ID</th><th>Deadline</th><th>Duration</th>
                  <th>Profit</th><th>Penalty</th><th>Arrival</th><th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => (
                  <tr key={job.id}>
                    <td><span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[idx % COLORS.length], display: 'inline-block' }} /></td>
                    <td className="mono">J{job.id}</td>
                    {['deadline','duration','profit','penalty','arrival_time'].map(f => (
                      <td key={f}>
                        <input className="form-input mono" style={{ width: 80, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                          type="number" value={job[f]}
                          onChange={e => handleUpdateJob(idx, f, e.target.value)} />
                      </td>
                    ))}
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleDeleteJob(idx)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Algorithm selector tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {algos.map(a => (
              <button key={a} onClick={() => setSelectedAlgo(a)}
                className={`algo-badge algo-${a === 'bruteforce_optimal' ? 'brute' : a === 'ai_enhanced' ? 'ai' : a === 'priority_queue' ? 'priority' : a}`}
                style={{ cursor: 'pointer', padding: '0.45rem 1rem', fontSize: '0.8rem',
                  outline: selectedAlgo === a ? '2px solid currentColor' : 'none', outlineOffset: 2 }}>
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Summary stats */}
          {activeResult && (
            <div className="stat-grid">
              <div className="stat-card stat-profit">
                <div className="stat-label">Total Profit</div>
                <div className="stat-value text-success">₹{activeResult.total_profit}</div>
                <div className="stat-sub">{activeResult.jobs_scheduled} jobs scheduled</div>
              </div>
              <div className="stat-card stat-penalty">
                <div className="stat-label">Total Penalty</div>
                <div className="stat-value text-danger">₹{activeResult.total_penalty}</div>
                <div className="stat-sub">{activeResult.jobs_missed} jobs missed</div>
              </div>
              <div className="stat-card stat-net">
                <div className="stat-label">Net Profit</div>
                <div className="stat-value text-accent">₹{activeResult.net_profit}</div>
                <div className="stat-sub">profit − penalty</div>
              </div>
              <div className="stat-card stat-util">
                <div className="stat-label">Utilization</div>
                <div className="stat-value" style={{ color: 'var(--amber-light)' }}>{(activeResult.utilization * 100).toFixed(1)}%</div>
                <div className="stat-sub">{activeResult.execution_time_ms.toFixed(2)} ms</div>
              </div>
            </div>
          )}

          {/* Gantt Chart */}
          {activeResult && (
            <div className="card card-glow" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">Gantt Chart — {selectedAlgo.replace(/_/g, ' ')}</div>
              <GanttChart scheduledJobs={activeResult.scheduled_jobs} allJobs={jobs} />
            </div>
          )}

          {/* Summary Table */}
          <div className="card">
            <div className="card-title"><TrendingUp size={14} /> Algorithm Comparison</div>
            <SummaryTable summary={results.summary} />
          </div>
        </>
      )}

      {!jobs.length && (
        <div className="empty-state card">
          <Shuffle size={48} />
          <p>Generate or add jobs above to begin scheduling</p>
        </div>
      )}
    </div>
  );
}
