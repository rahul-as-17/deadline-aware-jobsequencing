import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown } from 'lucide-react';
import { modelStatus } from '../api.js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';

export default function Analytics({ addToast, modelReady }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    modelStatus().then(s => { if (s.training_history) setHistory(s.training_history); }).catch(() => {});
  }, [modelReady]);

  const lossData = history ? history.train_loss.map((tl, i) => ({
    epoch: i + 1, 'Train Loss': +tl.toFixed(4), 'Val Loss': +history.val_loss[i].toFixed(4),
  })) : [];

  const accData = history ? history.train_acc.map((ta, i) => ({
    epoch: i + 1, 'Train Acc': +(ta * 100).toFixed(1), 'Val Acc': +(history.val_acc[i] * 100).toFixed(1),
  })) : [];

  const gapData = history ? history.train_loss.map((tl, i) => ({
    epoch: i + 1, 'Generalization Gap': +((history.val_loss[i] - tl) * 100).toFixed(2),
  })) : [];

  const bestEpoch = history ? history.val_loss.indexOf(Math.min(...history.val_loss)) + 1 : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Training Analytics</h2>
        <p>Visualize model training curves, convergence, and generalization performance.</p>
      </div>

      {!history ? (
        <div className="empty-state card"><BarChart3 size={48} /><p>No training data yet -- train the AI model first.</p></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            {[
              { l: 'Epochs Trained', v: history.train_loss.length, c: 'stat-net' },
              { l: 'Best Val Acc',   v: (Math.max(...history.val_acc) * 100).toFixed(1) + '%', c: 'stat-profit' },
              { l: 'Best Val Loss',  v: Math.min(...history.val_loss).toFixed(4), c: 'stat-penalty' },
              { l: 'Final Train Acc', v: (history.train_acc.at(-1) * 100).toFixed(1) + '%', c: 'stat-util' },
              { l: 'Best Epoch',     v: '#' + bestEpoch, c: 'stat-net' },
              { l: 'Convergence',    v: history.train_loss.length < 100 ? 'Early Stop' : 'Full', c: 'stat-profit' },
            ].map(({ l, v, c }) => (
              <div key={l} className={`stat-card ${c}`}>
                <div className="stat-label">{l}</div>
                <div className="stat-value" style={{ fontSize: '1.3rem' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Loss Curve */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title"><TrendingDown size={14} /> Loss Curve (BCE)</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lossData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" tick={{ fontSize: 11 }}
                  label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Train Loss" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Val Loss" stroke="#dc2626" strokeWidth={2} dot={false} />
                {/* Best epoch marker */}
                {bestEpoch && (
                  <Line type="monotone" dataKey="Val Loss" stroke="transparent" dot={(props) => {
                    if (props.index + 1 === bestEpoch)
                      return <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="#059669" stroke="#fff" strokeWidth={2} />;
                    return null;
                  }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy Curve */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title"><BarChart3 size={14} /> Accuracy Curve</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={accData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" tick={{ fontSize: 11 }}
                  label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Train Acc" stroke="#059669" fill="#059669" fillOpacity={0.08} strokeWidth={2} />
                <Area type="monotone" dataKey="Val Acc" stroke="#0891b2" fill="#0891b2" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Generalization Gap */}
          <div className="card">
            <div className="card-title">Generalization Gap (Val Loss - Train Loss) x100</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gapData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="Generalization Gap" stroke="#d97706" fill="#d97706" fillOpacity={0.06} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              A small, stable gap indicates good generalization. Increasing gap suggests overfitting.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
