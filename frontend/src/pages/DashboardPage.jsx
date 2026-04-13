import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { TestCard } from "../components/dashboard/TestCard";
import { LandingPage } from "../components/landing/LandingPage.jsx";

function normalizeExam(examValue) {
  const v = String(examValue || "").toUpperCase();
  if (v.includes("JEE")) return "JEE Main";
  if (v.includes("MHT")) return "MHT-CET";
  return "Other";
}

export function DashboardPage() {
  const nav = useNavigate();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      try {
        const data = await apiFetch("/tests", { token: accessToken });
        if (!cancelled) setTests(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const welcomeName = useMemo(() => (user?.name ? user.name.split(" ")[0] : ""), [user?.name]);

  if (!accessToken) {
    return <LandingPage />;
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">
          Student Dashboard{welcomeName ? `, ${welcomeName}` : ""}
        </h1>
        <p className="text-secondary-600 mt-1">Start an exam-style test. Keep it focused and exam-friendly.</p>
      </div>

      {error ? (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link to="/select-test">
          <Button variant="primary">Choose Test</Button>
        </Link>
        <Link to="/analytics">
          <Button variant="outline">View Analytics</Button>
        </Link>
      </div>

      {tests.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((t) => (
            <TestCard
              key={t._id}
              testId={t._id}
              title={t.name || "Untitled Test"}
              examType={normalizeExam(t.exam)}
              duration={Math.round(Number(t.durationMs || 0) / 60000)}
              totalQuestions={t.totalQuestions || 0}
              difficulty={t.difficulty || "Easy"}
              description={t.description || ""}
              status={t.status || "available"}
              onClick={() => nav(`/exam/${t._id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-secondary-600">No tests available yet.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

