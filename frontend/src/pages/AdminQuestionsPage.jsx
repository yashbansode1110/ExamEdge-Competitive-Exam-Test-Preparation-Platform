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

  const [mode, setMode] = useState("manual"); // manual | ai | upload
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

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  async function onUploadFileChosen(e) {
    const f = e.target.files?.[0];
    setUploadFile(f || null);
    setUploadPreview(null);
    setError("");
    if (!f) return;
    try {
      const text = await f.text();
      const name = (f.name || "").toLowerCase();
      if (name.endsWith(".json") || f.type.includes("json")) {
        const data = JSON.parse(text);
        const rows = Array.isArray(data) ? data : data?.questions;
        if (!Array.isArray(rows)) throw new Error("JSON must be an array of questions or { questions: [...] }");
        setUploadPreview({
          kind: "json",
          count: rows.length,
          sample: rows.slice(0, 5)
        });
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        const headers = lines[0] ? lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "")) : [];
        setUploadPreview({
          kind: "csv",
          count: Math.max(0, lines.length - 1),
          headers,
          sampleLines: lines.slice(1, 6)
        });
      }
    } catch (err) {
      setError(err.message || "Could not read file for preview");
      setUploadFile(null);
    }
  }

  async function onUploadQuestionsSubmit() {
    if (!accessToken || !uploadFile) return;
    setError("");
    setSuccess("");
    setUploadBusy(true);
    try {
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");
      const fd = new FormData();
      fd.append("file", uploadFile);
      const data = await apiFetch("/api/admin/questions/bulk-upload", {
        method: "POST",
        token: accessToken,
        body: fd,
        allowOkFalse: true
      });

      const inserted = data.insertedCount ?? 0;
      const rowErr = data.rowErrorCount ?? 0;
      const insErr = data.insertErrorCount ?? 0;
      const total = data.totalRows ?? 0;
      const skipped = data.skippedCount ?? 0;
      const skippedDupes = data.skippedDuplicates ?? false;

      if (data.ok) {
        setSuccess(`Uploaded successfully: ${inserted} questions inserted.`);
        setUploadFile(null);
        setUploadPreview(null);
      } else {
        if (skippedDupes) {
          setSuccess(`Upload completed with duplicates skipped. (Total: ${total}, Inserted: ${inserted}, Skipped: ${skipped})`);
        } else if (inserted > 0) {
          setSuccess(`${inserted} questions inserted (partial success).`);
        }

        const firstErr = data.rowErrors?.[0]?.message || data.insertErrors?.[0]?.message || data.message;
        if (rowErr > 0 || insErr > 0) {
          setError(
            `Upload finished with issues: ${rowErr} validation errors, ${insErr} DB errors. ${firstErr ? `\nFirst issue: ${firstErr}` : ""}`
          );
        } else if (!data.ok && !skippedDupes) {
          setError(data.message || "Upload failed with unknown error");
        }
        
        if (inserted > 0) {
          setUploadFile(null);
          setUploadPreview(null);
        }
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  if (!accessToken) return null;

  return (
    <div className="space-y-6">


      <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1 border border-secondary-100 max-w-fit mb-6">
        <button type="button" className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-all ${mode === "manual" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setMode("manual")}>
          Manual Entry
        </button>
        <button type="button" className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-all ${mode === "upload" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setMode("upload")}>
          Upload Questions
        </button>
      </div>

      {mode === "upload" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 mb-6">
<div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-secondary-900 mb-1">Bulk upload (CSV / JSON)</h2>
            
            {error ? <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
            {success ? <Alert variant="success" className="mb-4" dismissible onDismiss={() => setSuccess("")}>{success}</Alert> : null}

            <p className="text-sm text-secondary-600 mb-4">
              Required fields per row: <strong>questionText</strong> (or text), <strong>options</strong> (JSON array of {"{key,text}"} or columns{" "}
              <strong>optionA</strong>…<strong>optionD</strong>), <strong>correctAnswer</strong> (option key), <strong>subject</strong>,{" "}
              <strong>chapter</strong>, <strong>difficulty</strong> (1–5 or easy/medium/hard), <strong>exam</strong> (e.g. JEE Main (PCM)).
            </p>

            <div className="space-y-6">
              <div className="border-2 border-dashed border-secondary-300 rounded-xl p-10 flex flex-col items-center justify-center bg-secondary-50 hover:bg-secondary-100 transition-colors cursor-pointer relative">
                <div className="text-4xl mb-3">📁</div>
                <div className="text-secondary-900 font-medium mb-1">Upload CSV or JSON file</div>
                <div className="text-xs text-secondary-500 max-w-sm text-center">Drag and drop your file here or click to browse</div>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={onUploadFileChosen}
                />
                {uploadFile && <div className="mt-4 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{uploadFile.name}</div>}
              </div>

              {uploadPreview ? (
                <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm">
                  <div className="font-semibold text-secondary-900 mb-2">
                    Preview — {uploadPreview.count} row{uploadPreview.count === 1 ? "" : "s"} detected ({uploadPreview.kind})
                  </div>
                  {uploadPreview.kind === "json" ? (
                    <ul className="list-disc pl-5 space-y-1 text-secondary-800">
                      {uploadPreview.sample.map((row, i) => (
                        <li key={i}>
                          <span className="text-secondary-600">#{i + 1}</span>{" "}
                          {(row.questionText || row.text || "").slice(0, 120)}
                          {(row.questionText || row.text || "").length > 120 ? "…" : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-secondary-600">Headers: {uploadPreview.headers.join(", ")}</div>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-white border border-secondary-200 rounded p-2 max-h-40">
                        {uploadPreview.sampleLines.join("\n")}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={uploadBusy || !uploadFile}
                  isLoading={uploadBusy}
                  onClick={onUploadQuestionsSubmit}
                >
                  {uploadBusy ? "Uploading…" : "Upload to database"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "manual" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 mb-6">
<div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-secondary-900 mb-1">Create Question</h2>
            {error ? <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
            {success ? <Alert variant="success" className="mb-4" dismissible onDismiss={() => setSuccess("")}>{success}</Alert> : null}

            <p className="text-sm text-secondary-600 mb-2">Admins can add MCQ or Numerical questions in real time.</p>
            <div className="rounded-md border border-secondary-200 bg-secondary-50 p-3 text-xs text-secondary-700 mb-5">
              <strong>Simple use:</strong> fill one question and click <strong>Create Question</strong>.<br />
              <strong>Batch use:</strong> click <strong>Queue Question</strong> for each question, then <strong>Save All Queued</strong> once.
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
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
                    className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
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
                    className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
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
                    className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block text-sm font-medium text-secondary-900">
                  Question Type
                  <select value={type} onChange={(e) => setType(e.target.value)} className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border">
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
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full mt-1 min-h-[140px] block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" required />
              </label>

              {type === "MCQ" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-secondary-900">Options (A-D)</div>
                    <div className="text-xs text-secondary-600">At least 2 options required</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {["A", "B", "C", "D"].map((k) => (
                      <label key={k} className="block text-sm font-medium text-secondary-900">
                        {k}
                        <input
                          value={options[k]}
                          onChange={(e) => setOptions((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                          required={k === correctOptionKey}
                        />
                      </label>
                    ))}
                  </div>

                  <label className="block text-sm font-medium text-secondary-900">
                    Correct Option Key
                    <select value={correctOptionKey} onChange={(e) => setCorrectOptionKey(e.target.value)} className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border">
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
                    className="block w-full mt-2 rounded-lg border-secondary-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminQuestionsPage;

