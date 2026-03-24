# ExamEdge

Production-grade MERN + AI microservice platform for competitive exam test preparation.

## Target exams (supported)
- JEE Main (PCM)
- MHT-CET (PCM)
- MHT-CET (PCB)

> NEET is intentionally not included.

## Quickstart (Docker)
1. Copy env files:
   - `backend/.env.example` → `backend/.env`
   - `ai-services/weak-topic-service/.env.example` → `ai-services/weak-topic-service/.env`
   - `ai-services/doubt-solver-service/.env.example` → `ai-services/doubt-solver-service/.env`
2. Run:
   - `docker compose up --build`
3. Open:
   - API: `http://localhost:4000/api/health`
   - Weak topic AI: `http://localhost:8001/health`
   - Doubt solver AI: `http://localhost:8002/health`
   - Web (dev): run locally (see below)

## Local dev (without Docker)
Prereqs: Node.js 20.10+ (recommended 20 LTS), Python 3.11+, MongoDB.

### Backend API
```bash
cd backend
npm install
npm run dev
```

### AI services
```bash
cd ai-services/weak-topic-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

```bash
cd ai-services/doubt-solver-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

