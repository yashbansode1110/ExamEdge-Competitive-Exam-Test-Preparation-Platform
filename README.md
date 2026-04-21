# 🎓 ExamEdge - Online Exam Preparation Platform

A comprehensive, production-ready MERN Stack Web Application designed for rigorous competitive exam preparation, specifically tailored for JEE Main and MHT-CET patterns. ExamEdge provides students with a realistic testing environment and actionable AI-driven performance analytics.

---

## 📖 Project Overview

ExamEdge bridges the gap between practice and perfection. It offers a secure, feature-rich platform where administrators can seamlessly manage questions and generate smart tests, while students can experience full-length exams mimicking real-world patterns. With integrated AI performance analysis, students receive personalized feedback on their strengths and weaknesses.

---

## ✨ Features

### 🔐 1. Authentication System
* **Secure Access**: JWT-based secure login and signup functionality.
* **Access Control**: Strict role-based access management for Admins and Students.

### 🛡️ 2. Admin Features
* **Test Creation**: Generate tests manually or dynamically via smart filters (subject, chapter, difficulty).
* **Bulk Uploads**: Effortlessly upload questions via CSV or JSON files.
* **Content Management**: Manage question banks and oversee generated tests through a dedicated console.

### 📝 3. Student Features
* **Realistic Testing**: Attempt full-length tests configured strictly to JEE or MHT-CET patterns.
* **Flexible Practice**: Take filtered or single-subject practice tests.
* **Intuitive Interface**: Seamless section-based navigation (Physics, Chemistry, Maths), complemented by "Save & Next" and "Mark for Review" toggles.
* **Time Management**: Robust timer-based exam system with distinct section locking where applicable.

### 📜 4. Instructions System
* **Dynamic Rendering**: Displays tailored instructions based on the test type (JEE, MHT-CET, or Custom Filtered).
* **Compliance**: Mandates user confirmation of instructions before test commencement.

### 🛑 5. Anti-Cheating System
* **Environment Enforcement**: Enforces a strict fullscreen mode during the examination.
* **Activity Tracking**: Actively detects and logs fullscreen exits, tab switches, and right-clicks.
* **Automated Penalty**: Auto-submits the exam immediately after 3 warnings are triggered, maintaining exam integrity.

### 🤖 6. AI Features
* **Smart Analytics**: Leverages the Google Gemini API to generate comprehensive performance analysis for students.
* **Personalized Insights**: Highlights specific strengths, pinpoints weak topics, and provides actionable study recommendations.
* **Fault Tolerance**: Includes an automatic fallback system to ensure the process continues gracefully if the AI service is temporarily unavailable.

### 📊 7. Analytics Dashboard
* **Visual Data**: Rendered using Recharts to present intuitive score trends and subject accuracy charts.
* **Progress Tracking**: Features a heat map of weak topics paired with AI-generated insights for targeted improvement.

---

## 📸 Screenshots

*(Placeholders - Add your screenshots here)*

*   ![Dashboard](docs/images/dashboard.png)
*   ![Exam Interface](docs/images/exam-interface.png)
*   ![Analytics Report](docs/images/analytics-report.png)
*   ![Admin Panel](docs/images/admin-panel.png)

---

## 💻 Tech Stack

### Frontend
* **React.js** (via Vite for optimized builds)
* **Tailwind CSS** (for responsive, modern styling)
* **Recharts** (for interactive data visualization)

### Backend
* **Node.js**
* **Express.js**

### Database
* **MongoDB** (with Mongoose ODM)

### AI Integration
* **Google Gemini API** (for advanced text generation and data analysis)

---

## 🚀 Installation Guide

Follow these steps to run ExamEdge locally:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ExamEdge.git
cd ExamEdge
```

### 2. Install Dependencies
You need to install packages for both the backend and frontend.

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
: ```bash
cd ../frontend
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the `backend` directory and configure the required keys (see the next section).

### 4. Run the Project
Start the backend and frontend servers simultaneously using a tool like concurrently (if configured), or open two terminal windows.

**Backend Terminal:**
```bash
cd backend
npm run dev
```

**Frontend Terminal:**
```bash
cd frontend
npm run dev
```

---

## 🔑 Environment Variables

To properly configure the application, securely set the following environment variables in your `backend/.env` file:

```env
# Database Settings
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/examedge

# Authentication
JWT_SECRET=your_super_secret_jwt_key
TOKEN_EXPIRATION=7d

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173

# AI Integration
GEMINI_API_KEY=your_google_gemini_api_key
```

---

## 📁 Folder Structure

```text
ExamEdge/
├── backend/
│   ├── config/          # Database & third-party config
│   ├── controllers/     # Route logic & request handling
│   ├── middlewares/     # Auth & error handling
│   ├── models/          # MongoDB Schemas (User, Question, Test, Attempt)
│   ├── routes/          # Express API route definitions
│   ├── services/        # External services (Gemini AI parsing)
│   └── server.js        # Main entry point
│
└── frontend/
    ├── public/          # Static assets
    ├── src/
    │   ├── assets/      # Images & icons
    │   ├── components/  # Reusable UI components (Exam interface, Modals)
    │   ├── context/     # Global state (Auth, Theme)
    │   ├── pages/       # Next.js equivalent page layouts
    │   ├── services/    # Axios API calls
    │   ├── utils/       # Helper functions
    │   ├── App.jsx      # React router configuration
    │   └── main.jsx     # Vite DOM render
    ├── package.json
    └── tailwind.config.js
```

---

## 🔌 API Endpoints Overview

The backend is structured around a RESTful architecture:

*   **`/api/auth`**: User registration, login, and token verification.
*   **`/api/tests`**: Generating smart tests, listing available tests, fetching test details.
*   **`/api/questions`**: Bulk uploading questions, standard CRUD operations for the question bank.
*   **`/api/analytics`**: Submitting test attempts, fetching user history and performance metrics.
*   **`/api/ai`**: Post-exam processing for Gemini-based insights and recommendations.

---

## 🔄 How the System Works

1.  **Test Origination**: An Administrator uploads a CSV/JSON of questions to populate the database and utilizes the "Smart Generator" to assemble a structured test.
2.  **Exam Attempt**: A Student logs in, navigates to the test, agrees to dynamic instructions, and enters the secure, fullscreen exam interface. 
3.  **Real-Time Processing**: The interface handles complex state management for navigation, timers, and anti-cheat tracking.
4.  **Submission & AI Gen**: Upon submission, the backend evaluates the attempt and simultaneously pings the Gemini API to construct personalized analytics.
5.  **Review**: The student is immediately redirected to their analytics dashboard to visualize scores and study recommendations.

---

## 🔮 Future Improvements

We have an exciting roadmap planned for ExamEdge:
*   🚀 **Rank Prediction**: Estimating user percentile/rank based on historic dataset benchmarks.
*   🧠 **Adaptive Testing**: Dynamically scaling question difficulty based on the student's real-time accuracy.
*   🤖 **AI Question Generation**: Utilizing AI to autonomously generate unique problem statements and options.

---

## 🤝 Contribution Guide

Contributions are always welcome! How to participate:

1. Fork the project.
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
