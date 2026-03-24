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
import { Card, CardBody } from "../components/ui/Card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function toPct(values) {
  const nums = (values || []).map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (!nums.length) return values || [];
  const max = Math.max(...nums);
  return max <= 1.01 ? nums.map((n) => n * 100) : nums;
}

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
  const subjectAccuracy = useMemo(
    () => data?.charts?.subjectAccuracy || { labels: [], datasets: [] },
    [data]
  );
  const topicAccuracy = useMemo(() => data?.charts?.topicAccuracy || { labels: [], datasets: [] }, [data]);

  // Weak-topic heatmap: render as a horizontal colored bar strip.
  const weakTopicHeatmap = useMemo(() => {
    const labels = topicAccuracy?.labels || [];
    const valuesRaw = topicAccuracy?.datasets?.[0]?.data || [];
    const values = toPct(valuesRaw);

    const colors = values.map((v) => {
      if (v >= 80) return "rgba(22, 163, 74, 0.75)"; // success green
      if (v >= 60) return "rgba(245, 158, 11, 0.75)"; // warning orange
      return "rgba(220, 38, 38, 0.75)"; // error red
    });

    return {
      labels,
      values,
      chartData: {
        labels,
        datasets: [
          {
            label: "Accuracy",
            data: values,
            backgroundColor: colors,
            borderColor: colors.map((c) => c.replace("0.75", "1")),
            borderWidth: 1,
          },
        ],
      },
    };
  }, [topicAccuracy]);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="py-10 text-center">
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Analytics</h1>
            <p className="text-secondary-600 text-sm">
              Please{" "}
              <Link className="text-primary-600 font-semibold" to="/login">
                login
              </Link>{" "}
              to see your performance.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Analytics Dashboard</h1>
        <p className="text-secondary-600 mt-1">Score trend, subject accuracy, and weak topic heatmap.</p>
        {error ? <div className="mt-3 text-sm text-error-700">{error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="text-sm font-semibold text-secondary-900 mb-3">Score trend</div>
            <div className="h-72">
              <Line
                data={scoreTrend}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-sm font-semibold text-secondary-900 mb-3">Subject accuracy</div>
            <div className="h-72">
              <Bar
                data={subjectAccuracy}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: "rgba(0,0,0,0.05)" } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardBody>
            <div className="text-sm font-semibold text-secondary-900 mb-3">Weak topic heatmap</div>
            <div className="h-72">
              <Bar
                data={weakTopicHeatmap.chartData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { display: false, max: 100, min: 0, grid: { display: false } },
                    y: { grid: { display: false }, ticks: { color: "#111827" } },
                  },
                }}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

