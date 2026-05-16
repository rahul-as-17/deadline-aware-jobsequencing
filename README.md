# Intelligent Deadline-Aware Job Scheduling System (DAA-EL)

> Combines Design & Analysis of Algorithms (DAA) with Machine Learning to optimize scheduling decisions under real-world deadline constraints.

## Features

| Feature | Details |
|---|---|
| **Algorithms** | Greedy, Brute-Force/Optimal, Dynamic Programming, Priority Queue |
| **AI Model** | PyTorch neural network trained on brute-force optimal solutions |
| **Objective** | Maximize total profit while minimizing deadline-miss penalties |
| **Frontend** | React + Vite dashboard with Gantt charts, comparison graphs, analytics |
| **Backend** | FastAPI REST API with auto-reload |

---

## Project Structure

```
DAA-EL/
├── algorithms/
│   ├── greedy_scheduler.py        # Profit/deadline-ratio greedy — O(n log n)
│   ├── bruteforce_scheduler.py    # Optimal exhaustive search — O(n!)
│   ├── dynamic_scheduler.py       # Weighted interval DP — O(n log n)
│   └── priority_queue_manager.py  # Real-time composite-score PQ
│
├── ai_model/
│   ├── dataset_generator.py       # Generates labeled training data
│   ├── model.py                   # PyTorch SchedulerNet / SchedulerNetV2
│   ├── train_model.py             # Training pipeline with early stopping
│   ├── predictor.py               # Loads model, predicts priorities
│   └── saved_models/
│       ├── scheduler_model.pth    # Trained weights (after training)
│       └── training_history.json  # Loss/accuracy history
│
├── data/
│   ├── training_data.csv          # Generated labeled dataset
│   └── dataset_meta.json          # Dataset metadata
│
├── frontend/                      # React + Vite SPA
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx      # Overview + quick demo
│       │   ├── Scheduler.jsx      # Job editor + run algorithms
│       │   ├── Compare.jsx        # Side-by-side comparison + charts
│       │   ├── Analytics.jsx      # Training curves
│       │   └── TrainAI.jsx        # AI training controls
│       └── components/
│           ├── GanttChart.jsx     # Gantt visualization
│           └── SummaryTable.jsx   # Results comparison table
│
├── app.py                         # FastAPI backend
├── start.bat                      # One-click startup script
└── train_ai.bat                   # One-click AI training script
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Install frontend dependencies
```bash
cd frontend && npm install
```

### 3. Start everything (one command)
```bash
# Double-click start.bat, OR:
start.bat
```
This launches:
- **Backend API** → `http://localhost:8000`
- **Frontend UI** → `http://localhost:5173`
- **API Docs (Swagger)** → `http://localhost:8000/docs`

---

## AI Training

The AI model must be trained before the "AI Enhanced" algorithm becomes available.

### Option A — Web UI
1. Open the app → go to **Train AI** page
2. Configure samples/epochs and click **Generate Data & Train Model**
3. Wait ~2–5 min (progress visible in backend terminal)
4. The model auto-loads — sidebar shows **"AI Model Ready"**

### Option B — Command Line
```bash
# Double-click train_ai.bat, OR:
python -c "
from ai_model.dataset_generator import generate_training_data
from ai_model.train_model import train_model
path, rows = generate_training_data(n_samples=2000)
train_model(data_path=path, epochs=100)
"
```

---

## Algorithm Details

### Greedy Scheduler
- Sorts jobs by `profit / deadline` ratio (descending)
- Assigns each job to the latest available slot before its deadline
- **Complexity:** O(n log n) sort + O(n × d) assignment

### Brute-Force / Optimal
- Exhaustively evaluates all subsets and permutations
- Guaranteed optimal — limited to ≤12 jobs for feasibility
- **Complexity:** O(n! × n)

### Dynamic Programming
- Weighted interval scheduling with binary search
- Finds optimal non-overlapping job set
- **Complexity:** O(n log n)

### Priority Queue
- Real-time simulation advancing time step-by-step
- Composite score = w₁×profit + w₂×urgency + w₃×penalty
- **Complexity:** O(n log n)

### AI Enhanced
- Neural network predicts scheduling priority for each job
- 10 features: deadline, duration, profit, penalty, arrival, urgency, slack, density, competition, etc.
- Trained to replicate brute-force optimal decisions

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/generate-jobs` | Generate random job set |
| POST | `/api/schedule/greedy` | Run greedy algorithm |
| POST | `/api/schedule/bruteforce` | Run brute-force (≤12 jobs) |
| POST | `/api/schedule/dynamic` | Run DP algorithm |
| POST | `/api/schedule/priority-queue` | Run priority queue |
| POST | `/api/schedule/ai` | Run AI-enhanced scheduling |
| POST | `/api/compare` | Run all algorithms and compare |
| POST | `/api/train` | Generate data + train AI model |
| GET  | `/api/model-status` | Check AI model status |

Full interactive docs: `http://localhost:8000/docs`

---

## Job Schema

```json
{
  "id": 1,
  "deadline": 8,
  "duration": 2,
  "profit": 75.0,
  "penalty": 20.0,
  "arrival_time": 0
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Algorithms | Pure Python (stdlib only) |
| AI / ML | PyTorch 2.x, scikit-learn |
| Frontend | React 19, Vite 8, Recharts, Lucide |
| Data | CSV (training), JSON (metadata) |
