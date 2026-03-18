# ExamEdge

**ExamEdge** is a production-grade **MERN + AI microservice platform** designed for competitive exam preparation.
It provides a **real exam simulation environment**, advanced **performance analytics**, and **AI-powered learning assistance** for students preparing for **JEE Main and MHT-CET**.

The platform replicates real exam interfaces and implements secure, scalable test engine architecture.

---

# Project Overview

ExamEdge is built to help students practice tests in a **realistic exam environment** similar to official exam software used in competitive exams.

The platform provides:

* Real exam simulation
* Accurate marking schemes
* Secure exam environment
* Detailed performance analytics
* AI-powered learning recommendations

---

# Supported Exams

### JEE Main (PCM)

* Physics: 25 Questions
* Chemistry: 25 Questions
* Mathematics: 25 Questions
* Total Questions: **75**

Marking Scheme

* Correct Answer → **+4**
* Incorrect Answer → **−1**
* Unanswered → **0**

Duration

* **3 Hours**

Question Types

* Multiple Choice Questions
* Numerical Value Questions

---

### MHT-CET PCM

Total Questions: **150**

Subjects

* Physics → 50 Questions
* Chemistry → 50 Questions
* Mathematics → 50 Questions

Session Structure

Session 1

Physics + Chemistry
**90 Minutes**

Session 2

Mathematics
**90 Minutes**

Marks

* Physics → +1
* Chemistry → +1
* Mathematics → +2

Negative Marking

* **None**

---

### MHT-CET PCB

Session 1

Physics + Chemistry
**90 Minutes**

Session 2

Biology
**90 Minutes**

Marks

* Physics → +1
* Chemistry → +1
* Biology → +1

Negative Marking

* **None**

---

# Core Features

## 1 Authentication System

Secure user authentication system with role-based access.

User roles

* Student
* Parent
* Admin

Security

* JWT Authentication
* Password hashing using bcrypt
* Rate limiting
* Token validation

---

## 2 Question Bank System

Centralized question management system.

Question attributes

* Exam type
* Subject
* Chapter
* Topic
* Difficulty level
* MCQ / Numerical type
* Latex formula support
* Step-by-step solution

Admin capabilities

* Add questions
* Edit questions
* Delete questions
* Filter by subject or chapter

---

## 3 High Performance Test Engine

Core component responsible for conducting exams.

Capabilities

* Handles **300+ questions efficiently**
* Autosave answers
* Resume test after refresh
* Section-based exams
* Mark for review
* Question navigation

Performance Optimizations

* Indexed database queries
* Minimal frontend rendering
* Optimized result calculation

---

## 4 Exam Simulation Interface

Exam UI designed similar to real exam software.

### JEE Interface

Features

* Question palette
* Timer
* Section navigation
* Mark for review
* Question status colors

Palette Colors

* Gray → Not visited
* Green → Answered
* Red → Not answered
* Purple → Marked for review

---

### MHT-CET Interface

Simplified layout including

* Question number
* Timer
* Navigation buttons
* Answer selection

Purpose

* Reduce exam anxiety
* Improve familiarity with real exam system

---

## 5 Autosave and Resume System

Ensures answers are not lost during unexpected events.

Features

* Autosave every few seconds
* Resume test after refresh
* Local backup using browser storage
* Server synchronization

---

## 6 Timer Enforcement

Exam timer is validated by the server.

Features

* Auto-submit when time expires
* Prevent timer manipulation
* Section timers for MHT-CET sessions

---

## 7 Cheating Prevention System

Exam security mechanisms implemented.

Restrictions

* Disable copy-paste
* Disable text selection
* Disable right click
* Disable drag copying

Monitoring

* Tab switching detection
* Multiple tab detection
* Fullscreen enforcement
* Cheating logs

---

## 8 Performance Analytics Dashboard

Provides detailed insights for students.

Metrics

* Subject-wise accuracy
* Score trends
* Weak topic detection
* Time per question
* Test history

Visualization

* Charts powered by **Chart.js**

---

## 9 AI Weak Topic Recommender

AI system that analyzes student performance and identifies weak areas.

Technology

* Python FastAPI
* Scikit-learn
* Sentence Transformers

Output

* Weak topics
* Recommended practice questions
---

## 12 Parent Dashboard

Allows parents to track student performance.

Displays

* Test history
* Subject performance
* Weekly activity
* Progress trends

---

## 13 Admin Panel

Platform management interface.

Admin capabilities

* Manage users
* Manage questions
* Create tests
* Monitor analytics

---

# Project Architecture

ExamEdge uses a **microservice-based architecture**.

```
ExamEdge
│
├── frontend
│   React application
│
├── backend
│   Node.js Express API
│
└── ai-services
    Python FastAPI microservices
```

---

# Backend Architecture (MVC)

```
backend
│
├── config
├── models
├── controllers
├── routes
├── services
├── middleware
└── utils
```

Responsibilities

Models → Database schemas
Controllers → API logic
Services → Business logic
Routes → Endpoint definitions
Middleware → Authentication and security

---

# Tech Stack

### Frontend

* React (latest)
* Vite
* Tailwind CSS
* Redux Toolkit
* Chart.js
* KaTeX

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcrypt

### AI Services

* Python
* FastAPI
* Scikit-learn
* Sentence Transformers
* FAISS

---

# Project Setup

## Quickstart Using Docker

Copy environment files

```
backend/.env.example → backend/.env
ai-services/weak-topic-service/.env.example → ai-services/weak-topic-service/.env
ai-services/doubt-solver-service/.env.example → ai-services/doubt-solver-service/.env
```

Run the project

```
docker compose up --build
```

Open services

```
API → http://localhost:4000/api/health
Weak topic AI → http://localhost:8001/health
Doubt solver AI → http://localhost:8002/health
```

---

# Local Development Setup

### Backend

```
cd backend
npm install
npm run dev
```

---

### AI Weak Topic Service

```
cd ai-services/weak-topic-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

### AI Doubt Solver

```
cd ai-services/doubt-solver-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

---

### Frontend

```
cd frontend
npm install
npm run dev
```

---

# Scalability Considerations

System designed to support

* Millions of users
* Large question databases
* High concurrency test submissions

Optimizations

* Indexed MongoDB queries
* Efficient answer storage
* Minimal frontend rendering
* Autosave architecture

---

# Future Improvements

Possible enhancements

* Real time exam monitoring
* Mobile app
* AI personalized study plans
* Video solution integration
* Adaptive difficulty tests

---

# License

This project is intended for educational purposes and academic submission.

---

# Author

Developed as a final year project for competitive exam preparation platform.
