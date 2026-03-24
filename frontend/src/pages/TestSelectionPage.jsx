import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { TestCard } from "../components/dashboard/TestCard";

function normalizeExam(examValue) {
  const v = String(examValue || "").toUpperCase();
  if (v.includes("JEE")) return "JEE Main";
  if (v.includes("MHT")) return "MHT-CET";
  return "Other";
}

export function TestSelectionPage() {
  const nav = useNavigate();
  const { accessToken, user } = useSelector((s) => s.auth);

  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | JEE Main | MHT-CET

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/tests", { token: accessToken });
        if (!cancelled) setTests(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (filter === "all") return tests;
    return tests.filter((t) => normalizeExam(t.exam) === filter);
  }, [tests, filter]);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="py-12 text-center">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">Test Selection</h1>
            <p className="text-secondary-600 mb-6">Please log in to pick your exam.</p>
            <Link to="/login">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Choose Your Test</h1>
        <p className="text-secondary-600 mt-1">
          {user?.name ? `Hi ${user.name.split(" ")[0]}. ` : ""}Select JEE Main or MHT-CET and start.
        </p>
      </div>

      {error ? (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-secondary-700">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Exams</option>
            <option value="JEE Main">JEE Main</option>
            <option value="MHT-CET">MHT-CET</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={() => nav("/")}>
          Back to Dashboard
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5">
              <div className="skeleton h-8 w-2/3" />
              <div className="mt-3 skeleton h-4 w-full" />
              <div className="mt-2 skeleton h-4 w-5/6" />
            </Card>
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
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
          <CardBody className="py-12 text-center">
            <p className="text-secondary-600">No tests found for this exam.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default TestSelectionPage;

