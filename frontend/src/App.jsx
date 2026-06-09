import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Cpu, GitCompare, BarChart3, Brain, Activity, BookOpen, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import Scheduler from './pages/Scheduler.jsx';
import Compare from './pages/Compare.jsx';
import Analytics from './pages/Analytics.jsx';
import TrainAI from './pages/TrainAI.jsx';
import PerformanceAnalysis from './pages/PerformanceAnalysis.jsx';
import AboutProject from './pages/AboutProject.jsx';
import { modelStatus } from './api.js';

const PAGES = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'scheduler',  label: 'Scheduler',    icon: Cpu },
  { id: 'compare',    label: 'Compare',      icon: GitCompare },
  { id: 'analytics',  label: 'Analytics',    icon: BarChart3 },
  { id: 'performance',label: 'Performance',  icon: Activity },
  { id: 'train',      label: 'Train AI',     icon: Brain },
  { id: 'about',      label: 'About Project',icon: BookOpen },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [modelReady, setModelReady] = useState(false);
  const [toasts, setToasts] = useState([]);

  const checkModel = useCallback(async () => {
    try {
      const status = await modelStatus();
      setModelReady(status.model_loaded);
    } catch { setModelReady(false); }
  }, []);

  useEffect(() => { checkModel(); }, [checkModel]);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const ActivePage = { dashboard: Dashboard, scheduler: Scheduler, compare: Compare, analytics: Analytics, performance: PerformanceAnalysis, train: TrainAI, about: AboutProject }[page];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>DAA-EL</h1>
          <p>Intelligent Job Scheduler</p>
        </div>


        <nav className="sidebar-nav">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className={`model-badge ${modelReady ? '' : 'not-trained'}`}>
          <span className={`model-dot ${modelReady ? '' : 'off'}`} />
          {modelReady ? 'AI Model Ready' : 'AI Not Trained'}
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <ActivePage addToast={addToast} modelReady={modelReady} onModelTrained={checkModel} />
      </main>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(({ id, msg, type }) => (
          <div key={id} className={`toast toast-${type}`}>
            {type === 'success' && <CheckCircle size={14} />}
            {type === 'error' && <AlertTriangle size={14} />}
            {type === 'info' && <Info size={14} />}
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
