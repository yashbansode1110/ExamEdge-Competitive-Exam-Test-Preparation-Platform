import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { apiFetch } from "../services/api.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export function AnalyticsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !user?.id) return;
      try {
        const d = await apiFetch(`/analytics/student/${user.id}?limit=30`, { token: accessToken });
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  const scoreTrend = useMemo(() => data?.charts?.scoreTrend || { labels: [], datasets: [] }, [data]);
  const subjectAccuracy = useMemo(() => data?.charts?.subjectAccuracy || { labels: [], datasets: [] }, [data]);
  const topicAccuracy = useMemo(() => data?.charts?.topicAccuracy || { labels: [], datasets: [] }, [data]);
  const timePerQuestion = useMemo(() => data?.charts?.timePerQuestion || { labels: [], datasets: [] }, [data]);

  if (!accessToken) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <div className="text-lg font-semibold">Analytics</div>
        <div className="mt-2 text-sm text-slate-400">
          Please{" "}
          <Link className="text-indigo-400" to="/login">
            login
          </Link>{" "}
          to see your performance.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <div className="text-2xl font-semibold">Analytics</div>
        <div className="mt-1 text-sm text-slate-400">Chart.js-ready metrics: trends, accuracy, weak topics, time.</div>
        {error ? <div className="mt-3 text-sm text-rose-400">{error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm font-semibold text-slate-200">Score trend</div>
          <div className="mt-3">
            <Line data={scoreTrend} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm font-semibold text-slate-200">Avg time per question (sec)</div>
          <div className="mt-3">
            <Line data={timePerQuestion} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm font-semibold text-slate-200">Subject accuracy (%)</div>
          <div className="mt-3">
            <Bar data={subjectAccuracy} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm font-semibold text-slate-200">Weak topic accuracy (%)</div>
          <div className="mt-3">
            <Bar data={topicAccuracy} />
          </div>
        </div>
      </div>
    </div>
  );
}

