import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { SubjectCard } from "../components/admin/SubjectCard.jsx";

const PRESETS = {
  JEE_PCM: {
    label: "JEE Main (PCM)",
    exam: "JEE Main (PCM)",
    durationMinutes: 180,
    subjectCounts: { Physics: 25, Chemistry: 25, Mathematics: 25 },
    marking: { mode: "UNIFORM_NEGATIVE", correct: 4, wrong: 1, unanswered: 0 }
  },
  MHT_CET_PCM: {
    label: "MHT-CET (PCM)",
    exam: "MHT-CET (PCM)",
    durationMinutes: 180,
    subjectCounts: { Physics: 50, Chemistry: 50, Mathematics: 50 },
    marking: { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0 }
  },
  MHT_CET_PCB: {
    label: "MHT-CET (PCB)",
    exam: "MHT-CET (PCB)",
    durationMinutes: 180,
    subjectCounts: { Physics: 50, Chemistry: 50, Biology: 50 },
    marking: { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0 }
  }
};

function toPrettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function toSectionId(subject, index) {
  return `S${index + 1}_${String(subject).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function buildSectionsFromSubjectCounts(subjectCounts, totalDurationMinutes) {
  const subjects = Object.keys(subjectCounts).filter((s) => Number(subjectCounts[s]) > 0);
  if (!subjects.length) return [];

  const baseMinutes = Math.floor(totalDurationMinutes / subjects.length);
  const remainder = totalDurationMinutes % subjects.length;
  return subjects.map((subject, idx) => ({
    sectionId: toSectionId(subject, idx),
    name: subject,
    order: idx,
    durationMinutes: baseMinutes + (idx < remainder ? 1 : 0),
    subjects: [subject],
    questionCountBySubject: { [subject]: Number(subjectCounts[subject]) || 0 },
    allowedQuestionTypes: ["MCQ"],
    hardWindowEnforced: true
  }));
}

export function AdminTestsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [tests, setTests] = useState([]);

  const [preset, setPreset] = useState("JEE_PCM");
  const [name, setName] = useState("Real-Time Demo Test - Auto");
  const [exam, setExam] = useState(PRESETS.JEE_PCM.exam);
  const [durationMinutes, setDurationMinutes] = useState(PRESETS.JEE_PCM.durationMinutes);
  const [subjectCounts, setSubjectCounts] = useState({ ...PRESETS.JEE_PCM.subjectCounts });
  const [availableBySubject, setAvailableBySubject] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [difficultyBalance, setDifficultyBalance] = useState(false);

  const [markMode, setMarkMode] = useState(PRESETS.JEE_PCM.marking.mode);
  const [correct, setCorrect] = useState(PRESETS.JEE_PCM.marking.correct);
  const [wrong, setWrong] = useState(PRESETS.JEE_PCM.marking.wrong);
  const [unanswered, setUnanswered] = useState(PRESETS.JEE_PCM.marking.unanswered);

  const [sectionsJson, setSectionsJson] = useState(
    toPrettyJson(buildSectionsFromSubjectCounts(PRESETS.JEE_PCM.subjectCounts, PRESETS.JEE_PCM.durationMinutes))
  );

  const [filterExam, setFilterExam] = useState("JEE Main (PCM)");
  const [filterTestName, setFilterTestName] = useState("Filtered practice test");
  const [filterSubject, setFilterSubject] = useState("Physics");
  const [filterChapter, setFilterChapter] = useState("Kinematics");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterCount, setFilterCount] = useState(10);
  const [filterDurationMinutes, setFilterDurationMinutes] = useState(60);
  const [filterBusy, setFilterBusy] = useState(false);

  const filterSubjectOptions = useMemo(() => {
    const v = String(filterExam || "").toUpperCase();
    if (v.includes("MHT-CET") && v.includes("PCB")) return ["Physics", "Chemistry", "Biology"];
    return ["Physics", "Chemistry", "Mathematics"];
  }, [filterExam]);

  useEffect(() => {
    setFilterSubject((prev) => (filterSubjectOptions.includes(prev) ? prev : filterSubjectOptions[0]));
  }, [filterExam, filterSubjectOptions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      try {
        const d = await apiFetch("/tests", { token: accessToken });
        if (!cancelled) setTests(d.items || []);
      } catch {
        // ignore load errors
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    async function loadAvailability() {
      if (!accessToken) return;
      const subjects = Object.keys(subjectCounts).filter((s) => Number(subjectCounts[s]) >= 0);
      const out = {};
      await Promise.all(
        subjects.map(async (subject) => {
          try {
            const d = await apiFetch(`/api/questions/filter?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&page=1&limit=1`, {
              token: accessToken
            });
            out[subject] = Number(d.total || 0);
          } catch {
            out[subject] = null;
          }
        })
      );
      if (!cancelled) setAvailableBySubject(out);
    }
    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [accessToken, exam, subjectCounts]);

  const parsedSections = useMemo(() => {
    try {
      const v = JSON.parse(sectionsJson);
      return { ok: true, value: v };
    } catch (e) {
      return { ok: false, message: e.message || "Invalid JSON for sections" };
    }
  }, [sectionsJson]);

  const computedQuestionCount = useMemo(
    () => Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0),
    [subjectCounts]
  );

  function syncSectionsJson(nextSubjectCounts, nextDurationMinutes) {
    const sections = buildSectionsFromSubjectCounts(nextSubjectCounts, Number(nextDurationMinutes || 0));
    setSectionsJson(toPrettyJson(sections));
  }

  function applyPreset(presetKey) {
    if (presetKey === "CUSTOM") {
      setPreset("CUSTOM");
      setExam("Custom Exam");
      return;
    }
    const config = PRESETS[presetKey];
    if (!config) return;
    setPreset(presetKey);
    setExam(config.exam);
    setDurationMinutes(config.durationMinutes);
    setSubjectCounts({ ...config.subjectCounts });
    setMarkMode(config.marking.mode);
    setCorrect(config.marking.correct);
    setWrong(config.marking.wrong);
    setUnanswered(config.marking.unanswered);
    syncSectionsJson(config.subjectCounts, config.durationMinutes);
  }

  function onSubjectCountChange(subject, nextValue) {
    setSubjectCounts((prev) => {
      const next = { ...prev, [subject]: Math.max(0, Number(nextValue || 0)) };
      syncSectionsJson(next, durationMinutes);
      return next;
    });
  }

  async function onAutoGenerate() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      syncSectionsJson(subjectCounts, durationMinutes);
      setSuccess("Preset applied and sections generated.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");

      const sections = showAdvanced ? (parsedSections.ok ? parsedSections.value : null) : buildSectionsFromSubjectCounts(subjectCounts, durationMinutes);
      if (!sections) throw new Error(parsedSections.message || "Invalid sections JSON");
      if (!sections.length) throw new Error("At least one subject must have a positive question count");

      const body = {
        exam,
        name,
        sections,
        difficultyBalance,
        marking: {
          mode: markMode,
          correct,
          wrong,
          unanswered,
          weights: {}
        }
      };

      const data = await apiFetch("/api/admin/tests", { method: "POST", token: accessToken, body });
      setSuccess(`Test created successfully: ${data.id}`);
      const d = await apiFetch("/tests", { token: accessToken });
      setTests(d.items || []);
    } catch (err) {
      setError(err.message || "Failed to create test");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitFilterTest(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFilterBusy(true);
    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");
      const count = Math.max(1, Number(filterCount || 1));
      const sectionName = filterTopic.trim()
        ? `${filterSubject} — ${filterChapter} / ${filterTopic}`
        : `${filterSubject} — ${filterChapter || "All chapters"}`;
      const section = {
        sectionId: "S1_FILTER",
        name: sectionName,
        order: 0,
        durationMinutes: Math.max(1, Number(filterDurationMinutes || 1)),
        subjects: [filterSubject],
        questionCountBySubject: { [filterSubject]: count },
        allowedQuestionTypes: ["MCQ"],
        hardWindowEnforced: true,
        chapter: filterChapter.trim(),
        topic: filterTopic.trim(),
        ...(filterDifficulty !== "" && filterDifficulty != null
          ? { difficulty: Math.min(5, Math.max(1, Number(filterDifficulty))) }
          : {})
      };
      const body = {
        exam: filterExam,
        name: filterTestName.trim() || "Filtered test",
        sections: [section],
        difficultyBalance: false,
        marking: {
          mode: markMode,
          correct,
          wrong,
          unanswered,
          weights: {}
        }
      };
      const data = await apiFetch("/api/admin/tests", { method: "POST", token: accessToken, body });
      setSuccess(`Filter-based test created: ${data.id}`);
      const d = await apiFetch("/tests", { token: accessToken });
      setTests(d.items || []);
    } catch (err) {
      setError(err.message || "Failed to create filtered test");
    } finally {
      setFilterBusy(false);
    }
  }

  async function onDeleteTest(testId) {
    if (!accessToken) return;
    const ok = window.confirm("Delete this test? It will be deactivated and hidden from students.");
    if (!ok) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await apiFetch(`/api/admin/tests/${testId}`, { method: "DELETE", token: accessToken });
      setTests((prev) => prev.filter((t) => t._id !== testId));
      setSuccess("Test deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete test");
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken) return null;

  const subjectList = Object.keys(subjectCounts);

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
      {success ? <Alert variant="success" dismissible onDismiss={() => setSuccess("")}>{success}</Alert> : null}

      <Card>
        <CardBody className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-1">Create Test</h2>
          <p className="text-sm text-secondary-600 mb-4">Choose a preset, adjust question counts, and create test.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-secondary-900">
                Exam Preset
                <select
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full mt-1"
                >
                  <option value="JEE_PCM">JEE Main (PCM)</option>
                  <option value="MHT_CET_PCM">MHT-CET (PCM)</option>
                  <option value="MHT_CET_PCB">MHT-CET (PCB)</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Test Name
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Exam Label
                <input value={exam} onChange={(e) => setExam(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Total Duration (minutes)
                <input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => {
                    const next = Math.max(1, Number(e.target.value || 1));
                    setDurationMinutes(next);
                    syncSectionsJson(subjectCounts, next);
                  }}
                  className="w-full mt-1"
                  required
                />
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary-800">
              <input
                type="checkbox"
                checked={difficultyBalance}
                onChange={(e) => setDifficultyBalance(e.target.checked)}
              />
              <span>
                Balance difficulty (sample evenly across levels 1–5 per subject section when no section difficulty is set)
              </span>
            </label>

            <div className="rounded-lg border border-secondary-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-secondary-900">Subjects</div>
                  <div className="text-xs text-secondary-600">Edit question counts directly.</div>
                </div>
                <div className="text-xs text-secondary-600">Total Questions: <span className="font-semibold text-secondary-900">{computedQuestionCount}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {subjectList.map((subject) => (
                  <SubjectCard
                    key={subject}
                    subject={subject}
                    value={Number(subjectCounts[subject] || 0)}
                    availableCount={availableBySubject[subject]}
                    disabled={busy}
                    onChange={(value) => onSubjectCountChange(subject, value)}
                  />
                ))}
              </div>
            </div>

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

            <details className="rounded-md border border-secondary-200 p-3">
              <summary
                className="cursor-pointer text-sm font-medium text-secondary-900"
                onClick={() => setShowAdvanced((s) => !s)}
              >
                Advanced Settings (JSON)
              </summary>
              <label className="block text-sm font-medium text-secondary-900 pt-3">
                Sections JSON
                <textarea value={sectionsJson} onChange={(e) => setSectionsJson(e.target.value)} className="w-full mt-1 min-h-[220px] font-mono" />
              </label>
            </details>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <Button type="button" variant="outline" disabled={busy} onClick={onAutoGenerate}>
                Auto Generate Test
              </Button>
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
          <h2 className="text-xl font-bold text-secondary-900 mb-1">Smart filter test</h2>
          <p className="text-sm text-secondary-600 mb-4">
            Build a single-section test from subject, chapter, optional topic, optional difficulty, and question count (e.g. Physics → Kinematics → Medium → 10).
          </p>
          <form onSubmit={onSubmitFilterTest} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-secondary-900">
                Exam
                <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)} className="w-full mt-1" required>
                  <option value="JEE Main (PCM)">JEE Main (PCM)</option>
                  <option value="MHT-CET (PCM)">MHT-CET (PCM)</option>
                  <option value="MHT-CET (PCB)">MHT-CET (PCB)</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Test name
                <input value={filterTestName} onChange={(e) => setFilterTestName(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Subject
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full mt-1"
                  required
                >
                  {filterSubjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Chapter (exact match)
                <input value={filterChapter} onChange={(e) => setFilterChapter(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Topic (optional, exact match)
                <input value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="w-full mt-1" placeholder="Leave empty to ignore" />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Difficulty (optional)
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full mt-1"
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2 (Easy)</option>
                  <option value="3">3 (Medium)</option>
                  <option value="4">4</option>
                  <option value="5">5 (Hard)</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Question count
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={filterCount}
                  onChange={(e) => setFilterCount(Number(e.target.value))}
                  className="w-full mt-1"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Section duration (minutes)
                <input
                  type="number"
                  min={1}
                  value={filterDurationMinutes}
                  onChange={(e) => setFilterDurationMinutes(Number(e.target.value))}
                  className="w-full mt-1"
                  required
                />
              </label>
            </div>
            <Button type="submit" variant="primary" disabled={filterBusy || busy} isLoading={filterBusy}>
              {filterBusy ? "Creating…" : "Generate test from filters"}
            </Button>
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
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-secondary-600">version: {t.version || 1}</div>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onDeleteTest(t._id)}>
                      Delete
                    </Button>
                  </div>
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

