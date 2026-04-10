import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { apiFetch } from "../services/api.js";

function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
  });
  return q.toString();
}

export function AdminCheatingLogs() {
  const { accessToken } = useSelector((s) => s.auth);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [studentId, setStudentId] = useState("");
  const [examType, setExamType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(Number(total || 0) / Number(limit || 1))), [total, limit]);

  async function load() {
    if (!accessToken) return;
    setError("");
    setBusy(true);
    try {
      const query = toQuery({
        studentId,
        examType,
        from: fromDate ? new Date(fromDate).toISOString() : "",
        to: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : "",
        page,
        limit
      });
      const data = await apiFetch(`/api/admin/cheating-logs?${query}`, { token: accessToken });
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      setError(e.message || "Failed to load cheating logs");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  async function onApplyFilters(e) {
    e.preventDefault();
    setPage(1);
    await load();
  }

  async function onDownloadPdf() {
    if (!accessToken) return;
    setError("");
    try {
      const query = toQuery({
        studentId,
        examType,
        from: fromDate ? new Date(fromDate).toISOString() : "",
        to: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : ""
      });
      const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/admin/cheating-logs/export?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include"
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cheating-logs-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Failed to download PDF report");
    }
  }

  if (!accessToken) return null;

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}

      <Card>
        <CardBody className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-3">Cheating Logs</h2>

          <form onSubmit={onApplyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <label className="block text-sm font-medium text-secondary-900">
              Student ID
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full mt-1" placeholder="Mongo user id" />
            </label>
            <label className="block text-sm font-medium text-secondary-900">
              Exam Type
              <input value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full mt-1" placeholder="JEE Main (PCM)" />
            </label>
            <label className="block text-sm font-medium text-secondary-900">
              From
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full mt-1" />
            </label>
            <label className="block text-sm font-medium text-secondary-900">
              To
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full mt-1" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" isLoading={busy} disabled={busy}>Apply</Button>
              <Button type="button" variant="outline" onClick={onDownloadPdf}>Download PDF Report</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-secondary-900">
              <thead>
                <tr className="border-b border-secondary-200 text-left">
                  <th className="py-2 pr-3 text-secondary-800">Student Name</th>
                  <th className="py-2 pr-3 text-secondary-800">Exam</th>
                  <th className="py-2 pr-3 text-secondary-800">Event</th>
                  <th className="py-2 pr-3 text-secondary-800">Time</th>
                  <th className="py-2 pr-3 text-secondary-800">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id} className="border-b border-secondary-100 align-top">
                    <td className="py-2 pr-3 text-secondary-900">{row.studentName || "Unknown"}</td>
                    <td className="py-2 pr-3 text-secondary-900">{row.examType || "-"}</td>
                    <td className="py-2 pr-3 text-secondary-900">{row.eventType || "-"}</td>
                    <td className="py-2 pr-3 text-secondary-900">{new Date(row.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-3 break-all text-secondary-800">{typeof row.details === "string" ? row.details : JSON.stringify(row.details || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-secondary-600">Total logs: {total}</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-secondary-600">
                Limit
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="ml-1">
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <Button type="button" variant="outline" disabled={page <= 1 || busy} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <div className="text-xs text-secondary-700">Page {page} / {totalPages}</div>
              <Button type="button" variant="outline" disabled={page >= totalPages || busy} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminCheatingLogs;
