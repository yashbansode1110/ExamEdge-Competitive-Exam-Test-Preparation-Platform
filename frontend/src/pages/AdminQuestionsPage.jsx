import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

function optionListFromState(optionState) {
  return ["A", "B", "C", "D"]
    .map((key) => ({ key, text: optionState[key] || "" }))
    .filter((o) => o.text.trim().length > 0);
}

export function AdminQuestionsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [exam, setExam] = useState("JEE Main (PCM)");
  const [subject, setSubject] = useState("Mathematics");
  const [chapter, setChapter] = useState("Algebra");
  const [topic, setTopic] = useState("Quadratic Equations");
  const [subtopic, setSubtopic] = useState("Quadratic Equations");

  const [type, setType] = useState("MCQ"); // MCQ | NUMERICAL
  const [difficulty, setDifficulty] = useState(3);
  const [latex, setLatex] = useState(false);
  const [text, setText] = useState("");

  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [correctOptionKey, setCorrectOptionKey] = useState("A");

  const [numericalAnswer, setNumericalAnswer] = useState("");

  const payloadPreview = useMemo(() => {
    const base = {
      exam,
      subject,
      chapter,
      topic,
      subtopic,
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
  }, [exam, subject, chapter, topic, subtopic, type, difficulty, text, latex, options, correctOptionKey, numericalAnswer]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      if (!accessToken) throw new Error("Not authenticated");
      if (!String(user?.role || "").toLowerCase().includes("admin")) throw new Error("Admin access required");

      const body = {
        ...payloadPreview,
        // Add an explicit tag for easier debugging/QA.
        tags: ["admin"],
        source: "admin-ui",
        isActive: true
      };

      const data = await apiFetch("/api/admin/questions", {
        method: "POST",
        token: accessToken,
        body
      });

      setSuccess(`Question created: ${data.id}`);
      setText("");
      setOptions({ A: "", B: "", C: "", D: "" });
      setNumericalAnswer("");
    } catch (err) {
      setError(err.message || "Failed to create question");
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
          <h2 className="text-xl font-bold text-secondary-900 mb-1">Create Question</h2>
          <p className="text-sm text-secondary-600 mb-5">Admins can add MCQ or Numerical questions in real time.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-secondary-900">
                Exam
                <input value={exam} onChange={(e) => setExam(e.target.value)} className="w-full mt-1" required />
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
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Chapter
                <input value={chapter} onChange={(e) => setChapter(e.target.value)} className="w-full mt-1" required />
              </label>

              <label className="block text-sm font-medium text-secondary-900">
                Topic
                <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full mt-1" required />
              </label>
              <label className="block text-sm font-medium text-secondary-900">
                Subtopic
                <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} className="w-full mt-1" />
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

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={busy} isLoading={busy}>
                {busy ? "Creating..." : "Create Question"}
              </Button>
            </div>

            <div className="text-xs text-secondary-600 pt-2">
              Payload preview (for debugging): <span className="font-mono">{JSON.stringify(payloadPreview)}</span>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminQuestionsPage;

