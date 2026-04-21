import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";

export function ProfilePage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalTests: 0, averageScore: 0, bestScore: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !user?.id) return;
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/api/test-sessions/user/${user.id}`, { token: accessToken });
        if (!cancelled) {
          setItems(data.items || []);
          setSummary(data.summary || { totalTests: 0, averageScore: 0, bestScore: 0 });
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load profile analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  const avgAccuracy = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((sum, i) => sum + Number(i.accuracy || 0), 0) / items.length;
  }, [items]);

  if (!accessToken) return null;

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
      <Card>
        <CardBody className="p-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4">Profile & Test Analytics</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-secondary-200 p-3">
              <div className="text-xs text-secondary-600">Total Tests Given</div>
              <div className="text-xl font-bold text-secondary-900">{summary.totalTests}</div>
            </div>
            <div className="rounded-md border border-secondary-200 p-3">
              <div className="text-xs text-secondary-600">Average Score</div>
              <div className="text-xl font-bold text-secondary-900">{summary.averageScore}</div>
            </div>
            <div className="rounded-md border border-secondary-200 p-3">
              <div className="text-xs text-secondary-600">Best Score</div>
              <div className="text-xl font-bold text-secondary-900">{summary.bestScore}</div>
            </div>
          </div>
          <div className="text-xs text-secondary-600 mt-3">Average Accuracy: {avgAccuracy.toFixed(2)}%</div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-6">
          {loading ? (
            <div className="text-secondary-600">Loading sessions...</div>
          ) : (
            <div className="overflow-x-auto text-secondary-900">
              <table className="w-full text-sm">
                <thead className="text-secondary-600">
                  <tr className="border-b border-secondary-200 text-left">
                    <th className="py-2 pr-3 font-semibold">Test Name</th>
                    <th className="py-2 pr-3 font-semibold">Score</th>
                    <th className="py-2 pr-3 font-semibold">Total Marks</th>
                    <th className="py-2 pr-3 font-semibold">Accuracy %</th>
                    <th className="py-2 pr-3 font-semibold">Time Taken</th>
                    <th className="py-2 pr-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                      <td className="py-2 pr-3">{row.testName}</td>
                      <td className="py-2 pr-3 font-medium">{row.score}</td>
                      <td className="py-2 pr-3 text-secondary-600">{row.totalMarks}</td>
                      <td className="py-2 pr-3 text-secondary-600">{Number(row.accuracy || 0).toFixed(2)}%</td>
                      <td className="py-2 pr-3 text-secondary-600">{Math.round(Number(row.timeUsed || 0) / 60000)} min</td>
                      <td className="py-2 pr-3 text-secondary-500">{new Date(row.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default ProfilePage;
