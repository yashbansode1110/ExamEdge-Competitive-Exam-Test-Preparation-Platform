import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";

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

  if (!accessToken) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <h1 className="text-2xl font-semibold">Welcome to ExamEdge</h1>
        <p className="mt-2 text-slate-400">JEE Main and MHT-CET practice with exam-pattern enforcement.</p>
        <div className="mt-4 flex gap-3">
          <Link className="rounded-md bg-slate-800 px-4 py-2 hover:bg-slate-700" to="/login">
            Login
          </Link>
          <Link className="rounded-md bg-indigo-600 px-4 py-2 hover:bg-indigo-500" to="/register">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-slate-400">{user ? `Hi ${user.name}.` : " "} Start an exam-style test.</p>
        {error ? <div className="mt-3 text-sm text-rose-400">{error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((t) => (
          <div key={t._id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-lg font-semibold">{t.name}</div>
            <div className="mt-1 text-sm text-slate-400">
              {t.exam} • {t.totalQuestions} questions • {Math.round(t.durationMs / 60000)} minutes
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
                onClick={() => nav(`/exam/${t._id}`)}
              >
                Start / Resume
              </button>
              <Link className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700" to="/analytics">
                Analytics
              </Link>
            </div>
          </div>
        ))}
        {!tests.length ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 text-sm text-slate-400">
            No tests available yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

