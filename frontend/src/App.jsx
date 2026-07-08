import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Cpu, GitCompare, BarChart3, Brain, Activity, BookOpen, CheckCircle, AlertTriangle, Info, Play, Zap, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import Scheduler from './pages/Scheduler.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import DynamicSchedulerPage from './pages/DynamicSchedulerPage.jsx';
import Compare from './pages/Compare.jsx';
import Analytics from './pages/Analytics.jsx';
import TrainAI from './pages/TrainAI.jsx';
import PerformanceAnalysis from './pages/PerformanceAnalysis.jsx';
import AboutProject from './pages/AboutProject.jsx';
import { modelStatus } from './api.js';

const PAGES = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'scheduler',  label: 'Scheduler',    icon: Cpu },
  { id: 'simulation', label: 'Simulation',   icon: Play },
  { id: 'dynamic',    label: 'Dynamic Engine',icon: Zap },
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const checkModel = useCallback(async () => {
    try {
      const status = await modelStatus();
      setModelReady(status.model_loaded);
    } catch { setModelReady(false); }
  }, []);

  useEffect(() => { checkModel(); }, [checkModel]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>DAA-EL</h1>
            <p>Intelligent Job Scheduler</p>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
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
        <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'scheduler' ? 'block' : 'none' }}>
          <Scheduler addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'simulation' ? 'block' : 'none' }}>
          <SimulationPage addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'dynamic' ? 'block' : 'none' }}>
          <DynamicSchedulerPage addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'compare' ? 'block' : 'none' }}>
          <Compare addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'analytics' ? 'block' : 'none' }}>
          <Analytics addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'performance' ? 'block' : 'none' }}>
          <PerformanceAnalysis addToast={addToast} modelReady={modelReady} />
        </div>
        <div style={{ display: page === 'train' ? 'block' : 'none' }}>
          <TrainAI addToast={addToast} modelReady={modelReady} onModelTrained={checkModel} />
        </div>
        <div style={{ display: page === 'about' ? 'block' : 'none' }}>
          <AboutProject addToast={addToast} modelReady={modelReady} />
        </div>
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
