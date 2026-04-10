import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

/** Preset chapters per subject for admin question creation. */
const SUBJECT_CHAPTERS = {
  Physics: ["Kinematics", "Laws of Motion", "Work Energy Power"],
  Chemistry: ["Atomic Structure", "Bonding", "Thermodynamics"],
  Mathematics: ["Quadratic Equations", "Calculus", "Matrices"],
  Biology: ["Cell: Structure & Function", "Human Physiology", "Genetics"]
};
const EXAM_OPTIONS = ["JEE Main (PCM)", "MHT-CET (PCM)", "MHT-CET (PCB)"];

function optionListFromState(optionState) {
  return ["A", "B", "C", "D"]
    .map((key) => ({ key, text: optionState[key] || "" }))
    .filter((o) => o.text.trim().length > 0);
}

export function AdminQuestionsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);

  const [mode, setMode] = useState("manual"); // manual | ai
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  // -------------------------
  // Manual Entry (existing)
  // -------------------------
  const [exam, setExam] = useState("JEE Main (PCM)");
  const [subject, setSubject] = useState("Physics");
  const [chapter, setChapter] = useState(SUBJECT_CHAPTERS.Physics[0]);

  const allowedSubjects = useMemo(() => {
    const v = String(exam || "").toUpperCase();
    if (v.includes("MHT-CET") && v.includes("PCB")) return ["Physics", "Chemistry", "Biology"];
    if (v.includes("MHT-CET") && v.includes("PCM")) return ["Physics", "Chemistry", "Mathematics"];
    if (v.includes("JEE")) return ["Physics", "Chemistry", "Mathematics"];
    return Object.keys(SUBJECT_CHAPTERS);
  }, [exam]);

  const [type, setType] = useState("MCQ"); // MCQ | NUMERICAL
  const [difficulty, setDifficulty] = useState(3);
  const [latex, setLatex] = useState(false);
  const [text, setText] = useState("");

  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [correctOptionKey, setCorrectOptionKey] = useState("A");

  const [numericalAnswer, setNumericalAnswer] = useState("");
  const [manualBatch, setManualBatch] = useState([]);

  const payloadPreview = useMemo(() => {
    const base = {
      exam,
      subject,
      chapter,
      topic: chapter,
      subtopic: "",
      type,
      difficulty,
      text,
      latex
    };

    if (type === "MCQ") {
      return {
        ...base,
        options: optionListFromState(options),
        correctOptionKey
      };
    }

    return {
      ...base,
      numericalAnswer: numericalAnswer === "" ? undefined : Number(numericalAnswer)
    };
  }, [exam, subject, chapter, type, difficulty, text, latex, options, correctOptionKey, numericalAnswer]);

  function resetManualQuestionForm() {
    setText("");
    setOptions({ A: "", B: "", C: "", D: "" });
    setNumericalAnswer("");
    setCorrectOptionKey("A");
    setLatex(false);
  }

  function buildManualQuestionPayload() {
    return {
      ...payloadPreview,
      tags: ["admin"],
      source: "manual",
      isActive: true
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");

      const body = buildManualQuestionPayload();

      const data = await apiFetch("/api/admin/questions", {
        method: "POST",
        token: accessToken,
        body
      });

      setSuccess(`Question created: ${data.id}`);
      resetManualQuestionForm();
    } catch (err) {
      setError(err.message || "Failed to create question");
    } finally {
      setBusy(false);
    }
  }

  function onAddToBatch() {
    try {
      const body = buildManualQuestionPayload();
      if (!body.text?.trim()) throw new Error("Question text is required");
      if (body.type === "MCQ") {
        if (!Array.isArray(body.options) || body.options.length < 2) throw new Error("MCQ requires at least 2 options");
        if (!body.options.some((o) => o.key === body.correctOptionKey)) throw new Error("Correct option key must exist in options");
      } else if (body.numericalAnswer == null || Number.isNaN(Number(body.numericalAnswer))) {
        throw new Error("Numerical answer is required");
      }

      setManualBatch((prev) => [...prev, body]);
      setSuccess("Question added to batch queue.");
      setError("");
      resetManualQuestionForm();
    } catch (err) {
      setError(err.message || "Unable to add question to batch");
    }
  }

  async function onSaveManualBatch() {
    if (!accessToken) return;
    if (!manualBatch.length) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/admin/questions/bulk", {
        method: "POST",
        token: accessToken,
        body: { questions: manualBatch }
      });
      setManualBatch([]);
      if (data.failedCount > 0) {
        setError(`${data.failedCount} questions failed. ${data.createdCount} created successfully.`);
      } else {
        setSuccess(`${data.createdCount} questions created successfully.`);
      }
    } catch (err) {
      setError(err.message || "Failed to create questions in bulk");
    } finally {
      setBusy(false);
    }
  }

  // -------------------------
  // AI Generator (new)
  // -------------------------
  const [aiExam, setAiExam] = useState("JEE Main (PCM)");
  const [aiSubject, setAiSubject] = useState("Mathematics");
  const [aiChapter, setAiChapter] = useState(SUBJECT_CHAPTERS.Mathematics[0]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium"); // Easy | Medium | Hard
  const [aiCount, setAiCount] = useState(5);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiPreviewQuestions, setAiPreviewQuestions] = useState([]);

  const allowedAiSubjects = useMemo(() => {
    const v = String(aiExam || "").toUpperCase();
    if (v.includes("MHT-CET") && v.includes("PCB")) return ["Physics", "Chemistry", "Biology"];
    if (v.includes("MHT-CET") && v.includes("PCM")) return ["Physics", "Chemistry", "Mathematics"];
    if (v.includes("JEE")) return ["Physics", "Chemistry", "Mathematics"];
    return Object.keys(SUBJECT_CHAPTERS);
  }, [aiExam]);

  function aiDifficultyLabelToNumber(label) {
    if (label === "Easy") return 2;
    if (label === "Medium") return 3;
    return 5; // Hard
  }

  async function onGenerateQuestions(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAiPreviewQuestions([]);
    setAiBusy(true);

    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");
      if (!aiTopic.trim()) throw new Error("Topic is required");

      const data = await apiFetch("/api/generate-questions", {
        method: "POST",
        token: accessToken,
        body: {
          exam: aiExam,
          subject: aiSubject,
          topic: aiTopic,
          difficulty: aiDifficulty,
          count: Number(aiCount)
        }
      });

      setAiPreviewQuestions(data.questions || []);
      setSuccess(`Generated ${data.questions?.length || 0} questions. Preview below.`);
    } catch (err) {
      setError(err.message || "Failed to generate questions");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSaveAllAiQuestions() {
    if (!accessToken) return;
    if (!aiPreviewQuestions.length) return;

    setError("");
    setSuccess("");
    setAiSaving(true);
    try {
      const difficultyNumber = aiDifficultyLabelToNumber(aiDifficulty);
      const chapterForAi = aiChapter || aiTopic;
      const payloadQuestions = aiPreviewQuestions.map((q) => ({
        exam: aiExam,
        subject: aiSubject,
        chapter: chapterForAi,
        topic: aiTopic,
        subtopic: "",
        type: "MCQ",
        difficulty: difficultyNumber,
        text: q.question,
        latex: false,
        options: ["A", "B", "C", "D"].map((key, idx) => ({
          key,
          text: q.options?.[idx] || ""
        })),
        correctOptionKey: q.correctAnswer,
        tags: ["ai-generator"],
        source: "ai",
        isActive: true
      }));

      const result = await apiFetch("/api/admin/questions/bulk", {
        method: "POST",
        token: accessToken,
        body: { questions: payloadQuestions }
      });

      if (result.failedCount > 0) {
        const failedIndexes = new Set((result.failures || []).map((f) => f.index));
        const remaining = aiPreviewQuestions.filter((_q, index) => failedIndexes.has(index));
        setAiPreviewQuestions(remaining);
        if (result.createdCount > 0) setSuccess(`${result.createdCount} AI-generated questions saved.`);
        setError(`${result.failedCount} questions failed to save. They remain in preview for retry.`);
      } else {
        setAiPreviewQuestions([]);
        setSuccess(`${result.createdCount} AI-generated questions saved.`);
      }
    } finally {
      setAiSaving(false);
    }
  }

  function onDeleteAiPreviewQuestion(idx) {
    setAiPreviewQuestions((prev) => prev.filter((_q, i) => i !== idx));
  }

  if (!accessToken) return null;

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
      {success ? <Alert variant="success" dismissible onDismiss={() => setSuccess("")}>{success}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant={mode === "manual" ? "primary" : "outline"} onClick={() => setMode("manual")}>
          Manual Entry
        </Button>
        <Button type="button" variant={mode === "ai" ? "primary" : "outline"} onClick={() => setMode("ai")}>
          Generate via AI
        </Button>
      </div>

      {mode === "manual" ? (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-1">Create Question</h2>
            <p className="text-sm text-secondary-600 mb-2">Admins can add MCQ or Numerical questions in real time.</p>
            <div className="rounded-md border border-secondary-200 bg-secondary-50 p-3 text-xs text-secondary-700 mb-5">
              <strong>Simple use:</strong> fill one question and click <strong>Create Question</strong>.<br />
              <strong>Batch use:</strong> click <strong>Queue Question</strong> for each question, then <strong>Save All Queued</strong> once.
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-secondary-900">
                  Exam
                  <select
                    value={exam}
                    onChange={(e) => {
                      const nextExam = e.target.value;
                      setExam(nextExam);
                      // Ensure subject stays valid for the selected exam (PCM vs PCB).
                      const v = String(nextExam || "").toUpperCase();
                      const nextAllowed =
                        v.includes("MHT-CET") && v.includes("PCB")
                          ? ["Physics", "Chemistry", "Biology"]
                          : ["Physics", "Chemistry", "Mathematics"];
                      if (!nextAllowed.includes(subject)) {
                        const fallback = nextAllowed[0];
                        setSubject(fallback);
                        const list = SUBJECT_CHAPTERS[fallback];
                        if (list?.length) setChapter(list[0]);
                      }
                    }}
                    className="w-full mt-1"
                    required
                  >
                    {EXAM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-secondary-900">
                  Difficulty (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full mt-1"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Subject
                  <select
                    value={subject}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSubject(next);
                      const list = SUBJECT_CHAPTERS[next];
                      if (list?.length) setChapter(list[0]);
                    }}
                    className="w-full mt-1"
                    required
                  >
                    {allowedSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-secondary-900">
                  Chapter
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full mt-1"
                    required
                  >
                    {(SUBJECT_CHAPTERS[subject] || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-secondary-900">
                  Question Type
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1">
                    <option value="MCQ">MCQ</option>
                    <option value="NUMERICAL">NUMERICAL</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Latex?
                  <div className="flex items-center gap-3 mt-1">
                    <input type="checkbox" checked={latex} onChange={(e) => setLatex(e.target.checked)} />
                    <span className="text-sm text-secondary-700">Render statement as LaTeX</span>
                  </div>
                </label>
              </div>

              <label className="block text-sm font-medium text-secondary-900">
                Question Text
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full mt-1 min-h-[140px]" required />
              </label>

              {type === "MCQ" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-secondary-900">Options (A-D)</div>
                    <div className="text-xs text-secondary-600">At least 2 options required</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["A", "B", "C", "D"].map((k) => (
                      <label key={k} className="block text-sm font-medium text-secondary-900">
                        {k}
                        <input
                          value={options[k]}
                          onChange={(e) => setOptions((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="w-full mt-1"
                          required={k === correctOptionKey}
                        />
                      </label>
                    ))}
                  </div>

                  <label className="block text-sm font-medium text-secondary-900">
                    Correct Option Key
                    <select value={correctOptionKey} onChange={(e) => setCorrectOptionKey(e.target.value)} className="w-full mt-1">
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </label>
                </div>
              ) : (
                <label className="block text-sm font-medium text-secondary-900">
                  Numerical Answer
                  <input
                    type="number"
                    value={numericalAnswer}
                    onChange={(e) => setNumericalAnswer(e.target.value)}
                    className="w-full mt-1"
                    required
                    step="any"
                  />
                </label>
              )}

              <div className="pt-2 flex flex-wrap gap-3">
                <Button type="submit" variant="primary" disabled={busy} isLoading={busy}>
                  {busy ? "Creating..." : "Create Question"}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={onAddToBatch}>
                  Queue Question
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || !manualBatch.length}
                  isLoading={busy && !!manualBatch.length}
                  onClick={onSaveManualBatch}
                >
                  Save All Queued ({manualBatch.length})
                </Button>
              </div>

              {manualBatch.length ? (
                <div className="rounded-md border border-secondary-200 p-3">
                  <div className="text-sm font-semibold text-secondary-900 mb-2">Queued Questions ({manualBatch.length})</div>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {manualBatch.map((q, idx) => (
                      <div key={`${idx}`} className="flex items-start justify-between gap-3 rounded border border-secondary-200 p-2">
                        <div>
                          <div className="text-xs text-secondary-700">{q.subject} • {q.topic} • {q.type}</div>
                          <div className="text-sm text-secondary-900">{q.text}</div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setManualBatch((prev) => prev.filter((_item, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <details className="text-xs text-secondary-600 pt-2">
                <summary className="cursor-pointer">Advanced: payload preview</summary>
                <div className="pt-1 break-all">
                  <span className="font-mono">{JSON.stringify(payloadPreview)}</span>
                </div>
              </details>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-1">AI Question Generator</h2>
            <p className="text-sm text-secondary-600 mb-5">
              Generate MCQ questions with preview. Save only the ones you want.
            </p>

            <form onSubmit={onGenerateQuestions} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-secondary-900">
                  Exam
                  <select
                    value={aiExam}
                    onChange={(e) => {
                      const nextExam = e.target.value;
                      setAiExam(nextExam);
                      const v = String(nextExam || "").toUpperCase();
                      const nextAllowed =
                        v.includes("MHT-CET") && v.includes("PCB")
                          ? ["Physics", "Chemistry", "Biology"]
                          : ["Physics", "Chemistry", "Mathematics"];
                      if (!nextAllowed.includes(aiSubject)) {
                        const fallback = nextAllowed[0];
                        setAiSubject(fallback);
                        const list = SUBJECT_CHAPTERS[fallback];
                        if (list?.length) setAiChapter(list[0]);
                      }
                    }}
                    className="w-full mt-1"
                    required
                  >
                    {EXAM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Difficulty
                  <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="w-full mt-1" required>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Subject
                  <select
                    value={aiSubject}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAiSubject(next);
                      const list = SUBJECT_CHAPTERS[next];
                      if (list?.length) setAiChapter(list[0]);
                    }}
                    className="w-full mt-1"
                    required
                  >
                    {allowedAiSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Chapter
                  <select
                    value={aiChapter}
                    onChange={(e) => setAiChapter(e.target.value)}
                    className="w-full mt-1"
                    required
                  >
                    {(SUBJECT_CHAPTERS[aiSubject] || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Number of Questions
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full mt-1"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-secondary-900 md:col-span-2">
                  Topic
                  <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="w-full mt-1" required />
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={aiBusy} isLoading={aiBusy}>
                  {aiBusy ? "Generating..." : "Generate Questions"}
                </Button>
              </div>
            </form>

            {aiPreviewQuestions.length ? (
              <div className="pt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-secondary-900">Preview ({aiPreviewQuestions.length})</div>
                    <div className="text-xs text-secondary-600">Delete unwanted questions before saving.</div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={aiSaving || aiBusy}
                    isLoading={aiSaving}
                    onClick={onSaveAllAiQuestions}
                  >
                    {aiSaving ? "Saving..." : "Save all"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {aiPreviewQuestions.map((q, idx) => (
                    <div key={`${idx}`} className="border border-secondary-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-secondary-900">Q{idx + 1}</div>
                        </div>

                        <Button type="button" variant="outline" disabled={aiSaving} onClick={() => onDeleteAiPreviewQuestion(idx)}>
                          Delete
                        </Button>
                      </div>

                      <div className="mt-2 whitespace-pre-wrap text-secondary-900">{q.question}</div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {["A", "B", "C", "D"].map((key, optIdx) => (
                          <div
                            key={key}
                            className={
                              q.correctAnswer === key
                                ? "rounded-md border border-primary-500 bg-primary-50 p-2"
                                : "rounded-md border border-secondary-200 p-2"
                            }
                          >
                            <div className="text-xs font-semibold text-secondary-900">{key}</div>
                            <div className="text-sm text-secondary-900">{q.options?.[optIdx] || ""}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 text-xs text-secondary-600">
                        Correct answer: <span className="font-mono">{q.correctAnswer}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default AdminQuestionsPage;

