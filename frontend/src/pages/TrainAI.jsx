import { useState, useCallback, useEffect } from 'react';
import { Brain, Play, Database, Zap } from 'lucide-react';
import { trainModel, trainingProgress } from '../api.js';

export default function TrainAI({ addToast, onModelTrained }) {
  const [loading, setLoading] = useState(false);
  const [nSamples, setNSamples] = useState(2000);
  const [epochs, setEpochs] = useState(100);
  const [batchSize, setBatchSize] = useState(64);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState('');
  const [liveProgress, setLiveProgress] = useState(null);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        trainingProgress().then(s => setLiveProgress(s)).catch(() => {});
      }, 2000);
    } else {
      setLiveProgress(null);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleTrain = useCallback(async () => {
    setLoading(true);
    setProgress('Generating training data & training model…');
    setResult(null);
    try {
      const data = await trainModel({ n_samples: nSamples, epochs, batch_size: batchSize });
      setResult(data);
      setProgress('');
      addToast('AI model trained successfully!', 'success');
      onModelTrained?.();
    } catch {
      addToast('Training failed — check backend console.', 'error');
      setProgress('');
    } finally { setLoading(false); }
  }, [nSamples, epochs, batchSize, addToast, onModelTrained]);

  return (
    <div>
      <div className="page-header">
        <h2>Train AI Model</h2>
        <p>Generate labeled data from brute-force optimal solutions and train a PyTorch neural network.</p>
      </div>

      {/* Training Pipeline Info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title"><Zap size={14} /> How It Works</div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { step: '1', title: 'Generate Jobs', desc: 'Create thousands of random job combinations.' },
            { step: '2', title: 'Optimal Labels', desc: 'Brute-force finds the optimal schedule for each set.' },
            { step: '3', title: 'Feature Extraction', desc: 'Extract 10 normalized features per job.' },
            { step: '4', title: 'Train Model', desc: 'PyTorch neural net learns scheduling patterns.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ flex: '1 1 180px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), var(--cyan))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.8rem',
              }}>{step}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Config */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title"><Brain size={14} /> Training Configuration</div>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ flex: '0 0 180px' }}>
            <label className="form-label">Training Samples</label>
            <input className="form-input" type="number" min={100} max={10000} step={100}
              value={nSamples} onChange={e => setNSamples(+e.target.value)} />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Each sample = one job set
            </div>
          </div>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Epochs</label>
            <input className="form-input" type="number" min={10} max={500} step={10}
              value={epochs} onChange={e => setEpochs(+e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label className="form-label">Batch Size</label>
            <select className="form-select" value={batchSize} onChange={e => setBatchSize(+e.target.value)}>
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value={64}>64</option>
              <option value={128}>128</option>
            </select>
          </div>
        </div>

        <button className="btn btn-emerald" onClick={handleTrain} disabled={loading || (liveProgress && liveProgress.status !== 'idle')}
          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
          {loading || (liveProgress && liveProgress.status !== 'idle')
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {progress || (liveProgress && liveProgress.status !== 'idle' ? 'Training in background...' : '')}</>
            : <><Play size={14} /> Generate Data &amp; Train Model</>}
        </button>

        {liveProgress && liveProgress.status !== 'idle' && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              <span>{liveProgress.status === 'generating_data' ? 'Generating Combinatorial Dataset...' : 'Training Neural Network...'}</span>
              <span>{liveProgress.status === 'training' ? `Epoch ${liveProgress.epoch} / ${liveProgress.total_epochs}` : ''}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--progress-wrap)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--accent), var(--cyan))', 
                width: liveProgress.status === 'generating_data' ? '5%' : `${(liveProgress.epoch / liveProgress.total_epochs) * 100}%`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="card card-glow">
          <div className="card-title"><Database size={14} /> Training Results</div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {[
              { label: 'Status', value: result.status === 'success' ? 'Success' : 'Failed', cls: 'stat-profit' },
              { label: 'Training Rows', value: result.training_rows?.toLocaleString(), cls: 'stat-net' },
              { label: 'Train Accuracy', value: `${(result.final_train_acc * 100).toFixed(1)}%`, cls: 'stat-util' },
              { label: 'Val Accuracy', value: `${(result.final_val_acc * 100).toFixed(1)}%`, cls: 'stat-penalty' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`stat-card ${cls}`}>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
