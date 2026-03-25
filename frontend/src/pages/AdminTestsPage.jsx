import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

const defaultSections = [
  {
    sectionId: "S1_MATH",
    name: "Mathematics",
    order: 0,
    durationMinutes: 30,
    subjects: ["Mathematics"],
    questionCountBySubject: { Mathematics: 3 },
    allowedQuestionTypes: ["MCQ"],
    hardWindowEnforced: true
  },
  {
    sectionId: "S2_PHYSICS",
    name: "Physics",
    order: 1,
    durationMinutes: 30,
    subjects: ["Physics"],
    questionCountBySubject: { Physics: 3 },
    allowedQuestionTypes: ["MCQ"],
    hardWindowEnforced: true
  }
];

export function AdminTestsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [tests, setTests] = useState([]);

  const [exam, setExam] = useState("JEE Main (PCM)");
  const [name, setName] = useState("Real-Time Demo Test - Auto");
  const [sectionsJson, setSectionsJson] = useState(JSON.stringify(defaultSections, null, 2));

  const [markMode, setMarkMode] = useState("UNIFORM_NEGATIVE");
  const [correct, setCorrect] = useState(1);
  const [wrong, setWrong] = useState(0);
  const [unanswered, setUnanswered] = useState(0);

  const [createdId, setCreatedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      try {
        const d = await apiFetch("/tests", { token: accessToken });
        if (!cancelled) setTests(d.items || []);
      } catch {
        // Keep silent; admin can still create tests.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const parsedSections = useMemo(() => {
    try {
      const v = JSON.parse(sectionsJson);
      return { ok: true, value: v };
    } catch (e) {
      return { ok: false, message: e.message || "Invalid JSON for sections" };
    }
  }, [sectionsJson]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreatedId("");
    setBusy(true);

    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");
      if (!parsedSections.ok) throw new Error(parsedSections.message);

      const body = {
        exam,
        name,
        sections: parsedSections.value,
        marking: {
          mode: markMode,
          correct,
          wrong,
          unanswered,
          weights: {}
        }
      };

      const data = await apiFetch("/api/admin/tests", { method: "POST", token: accessToken, body });
      setCreatedId(data.id);
      setSuccess(`Test created: ${data.id}`);
      try {
        const d = await apiFetch("/tests", { token: accessToken });
        setTests(d.items || []);
      } catch {
        // ignore refresh errors
      }
    } catch (err) {
      setError(err.message || "Failed to create test");
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken) return null;

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
      {success ? <Alert variant="success" dismissible onDismiss={() => setSuccess("")}>{success}</Alert> : null}

      <Card>
        <CardBody className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-1">Create Test</h2>
          <p className="text-sm text-secondary-600 mb-5">Paste section config in JSON. Each section includes subject counts (question blueprint).</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-secondary-900">
                Exam
                <input value={exam} onChange={(e) => setExam(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Test Name
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1" required />
              </label>
            </div>

            <label className="block text-sm font-medium text-secondary-900">
              Sections (JSON)
              <textarea value={sectionsJson} onChange={(e) => setSectionsJson(e.target.value)} className="w-full mt-1 min-h-[220px] font-mono" required />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-secondary-900">
                Marking Mode
                <select value={markMode} onChange={(e) => setMarkMode(e.target.value)} className="w-full mt-1">
                  <option value="UNIFORM_NEGATIVE">UNIFORM_NEGATIVE</option>
                  <option value="SUBJECT_WEIGHTS">SUBJECT_WEIGHTS</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block text-sm font-medium text-secondary-900">
                  Correct
                  <input type="number" value={correct} onChange={(e) => setCorrect(Number(e.target.value))} className="w-full mt-1" />
                </label>
                <label className="block text-sm font-medium text-secondary-900">
                  Wrong
                  <input type="number" value={wrong} onChange={(e) => setWrong(Number(e.target.value))} className="w-full mt-1" />
                </label>
                <label className="block text-sm font-medium text-secondary-900">
                  Unanswered
                  <input type="number" value={unanswered} onChange={(e) => setUnanswered(Number(e.target.value))} className="w-full mt-1" />
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <Button type="submit" variant="primary" disabled={busy} isLoading={busy}>
                {busy ? "Creating..." : "Create Test"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setError("");
                  setSuccess("");
                  setCreatedId("");
                  try {
                    const d = await apiFetch("/tests", { token: accessToken });
                    setTests(d.items || []);
                  } catch (e) {
                    setError(e.message || "Failed to refresh tests");
                  }
                }}
              >
                Refresh tests
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-6">
          <h3 className="text-lg font-bold text-secondary-900 mb-2">Existing Tests</h3>
          {tests.length ? (
            <div className="space-y-2">
              {tests.map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-3 rounded-md border border-secondary-200 p-3">
                  <div>
                    <div className="font-semibold text-secondary-900">{t.name}</div>
                    <div className="text-xs text-secondary-600">{t.exam} • {t.totalQuestions} questions • {Math.round(Number(t.durationMs || 0) / 60000)} min</div>
                  </div>
                  <div className="text-xs text-secondary-600">version: {t.version || 1}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-secondary-600">No tests found. Create one above.</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminTestsPage;

