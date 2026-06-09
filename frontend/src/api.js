import axios from 'axios';

const BASE = 'http://localhost:8000';
const api = axios.create({ baseURL: BASE, timeout: 300000 });

// Job generation
export const generateJobs = (nJobs, maxDeadline, seed = null) =>
  api.post('/api/generate-jobs', { n_jobs: nJobs, max_deadline: maxDeadline, seed }).then(r => r.data);

// Individual schedulers
export const scheduleGreedy   = (jobs) => api.post('/api/schedule/greedy',         { jobs }).then(r => r.data);
export const scheduleBrute    = (jobs) => api.post('/api/schedule/bruteforce',     { jobs }).then(r => r.data);
export const scheduleDynamic  = (jobs) => api.post('/api/schedule/dynamic',        { jobs }).then(r => r.data);
export const schedulePriority = (jobs) => api.post('/api/schedule/priority-queue', { jobs }).then(r => r.data);
export const scheduleAI       = (jobs) => api.post('/api/schedule/ai',             { jobs }).then(r => r.data);

// Compare all
export const compareAll = (jobs) => api.post('/api/compare', { jobs }).then(r => r.data);

// Training
export const trainModel  = (params) => api.post('/api/train', params).then(r => r.data);
export const modelStatus = () => api.get('/api/model-status').then(r => r.data);

// Performance Analysis
export const analyzeAccuracy      = (params) => api.post('/api/analysis/accuracy',          params).then(r => r.data);
export const analyzeGreedyOptimal = (params) => api.post('/api/analysis/greedy-vs-optimal',  params).then(r => r.data);
export const analyzeScalability   = (params) => api.post('/api/analysis/scalability',        params).then(r => r.data);
export const analyzeUtilization   = (params) => api.post('/api/analysis/utilization',        params).then(r => r.data);
export const analyzePenalty       = (params) => api.post('/api/analysis/penalty',             params).then(r => r.data);
export const analyzeAll           = (params) => api.post('/api/analysis/full',                params).then(r => r.data);

export const runSimulation = (jobs, algorithm) =>
  api.post('/api/simulate', { jobs, algorithm }).then(r => r.data);

export const runReschedule = (payload) =>
  api.post('/api/reschedule', payload).then(r => r.data);

export const explainSchedule = (payload) =>
  api.post('/api/oracle/explain', payload).then(r => r.data);

export const explainReschedule = (payload) =>
  api.post('/api/oracle/explain-reschedule', payload).then(r => r.data);

