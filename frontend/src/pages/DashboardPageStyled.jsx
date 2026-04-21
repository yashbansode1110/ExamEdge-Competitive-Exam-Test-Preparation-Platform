import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { StatCard } from "../components/dashboard/StatCard";
import { TestCard } from "../components/dashboard/TestCard";
import { Alert } from "../components/ui/Alert";

/**
 * Modern styled Dashboard page
 */
export function DashboardPageStyled() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const [testsData, statsData] = await Promise.all([
          apiFetch("/tests", { token: accessToken }),
          apiFetch("/analytics/overview", { token: accessToken }).catch(() => ({})),
        ]);

        if (!cancelled) {
          setTests(testsData.items || []);
          setStats(statsData);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="text-center py-12">
            <h1 className="text-4xl font-bold text-primary-700 mb-3">ExamEdge</h1>
            <p className="text-lg text-secondary-600 mb-6">
              Master JEE Main and MHT-CET with exam-pattern enforcement
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome back, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="dashboard-subtitle">
          Continue your exam preparation and track your progress
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          Failed to load dashboard: {error}
        </Alert>
      )}

      {/* Statistics Grid */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            title="Tests Taken"
            value={stats.testsTaken || 0}
            change="+2 this week"
            changeType="positive"
            color="primary"
            icon="📝"
          />
          <StatCard
            title="Average Score"
            value={stats.averageScore || 0}
            unit="%"
            change={stats.scoreChange || "0"}
            changeType={stats.scoreChange > 0 ? "positive" : "negative"}
            color="success"
            icon="🎯"
          />
          <StatCard
            title="Accuracy Rate"
            value={stats.accuracy || 0}
            unit="%"
            change={stats.accuracyChange || "0"}
            changeType="positive"
            color="success"
            icon="✓"
          />
          <StatCard
            title="Study Streak"
            value={stats.studyStreak || 0}
            unit="days"
            change="Keep it up!"
            changeType="neutral"
            color="warning"
            icon="🔥"
          />
        </div>
      )}

      {/* Tests Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-secondary-900">Available Tests</h2>
          <div className="flex gap-2">
            <select className="px-3 py-2 text-sm rounded-md border border-secondary-300">
              <option>All Exams</option>
              <option>JEE Main</option>
              <option>MHT-CET</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        ) : tests.length > 0 ? (
          <div className="tests-grid">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                testId={test.id}
                title={test.name}
                examType={test.examType}
                duration={test.duration}
                totalQuestions={test.totalQuestions}
                difficulty={test.difficulty}
                description={test.description}
                status={test.status || "available"}
                onClick={() => {
                  if (test.status === "available") {
                    window.location.href = `/instructions/${test.id}`;
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardBody>
              <p className="text-secondary-600 mb-4">No tests available yet.</p>
              <Link to="/analytics">
                <Button variant="primary">Browse Analytics</Button>
              </Link>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardBody className="py-6">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="font-semibold text-secondary-900 mb-2">Analytics</h3>
            <p className="text-sm text-secondary-600 mb-4">
              View your performance metrics and weak topics
            </p>
            <Link to="/analytics">
              <Button variant="outline" size="sm" className="w-full">
                View Analytics
              </Button>
            </Link>
          </CardBody>
        </Card>

        <Card className="text-center">
          <CardBody className="py-6">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="font-semibold text-secondary-900 mb-2">Study Guide</h3>
            <p className="text-sm text-secondary-600 mb-4">
              Access curated study materials and tips
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Explore Guide
            </Button>
          </CardBody>
        </Card>

        <Card className="text-center">
          <CardBody className="py-6">
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="font-semibold text-secondary-900 mb-2">Settings</h3>
            <p className="text-sm text-secondary-600 mb-4">
              Customize your exam preferences
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Go to Settings
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPageStyled;
