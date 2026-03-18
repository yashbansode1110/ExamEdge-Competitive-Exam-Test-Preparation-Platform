import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { ExamShell } from "../components/exam/ExamShell.jsx";
import { QuestionPaletteVirtual } from "../components/exam/QuestionPaletteVirtual.jsx";
import { QuestionPane } from "../components/exam/QuestionPane.jsx";
import { SectionTabs } from "../components/exam/SectionTabs.jsx";
import { TimerBar } from "../components/exam/TimerBar.jsx";
import { useExamSecurity } from "../utils/useExamSecurity.js";

function getOrCreateSessionId(key) {
  const prev = sessionStorage.getItem(key);
  if (prev) return prev;
  const id = (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).toString();
  sessionStorage.setItem(key, id);
  return id;
}

function msLeft(endsAt) {
  const t = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, t);
}

export function ExamInterfacePage() {
  const { testId } = useParams();
  const nav = useNavigate();
  const { accessToken } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => new Map());
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const activeQStartedAtRef = useRef(Date.now());
  const lastIndexRef = useRef(0);

  const sessionIdKey = useMemo(() => `examedge_test_session_${testId}`, [testId]);
  const sessionId = useMemo(() => getOrCreateSessionId(sessionIdKey), [sessionIdKey]);

  const cheatQueueRef = useRef([]);
  const networkQueueRef = useRef([]);
  useExamSecurity({
    channelKey: `examedge_guard_${testId}`,
    sessionId,
    onCheat: (evt) => cheatQueueRef.current.push(evt),
    onNetwork: (evt) => networkQueueRef.current.push(evt)
  });

  useEffect(() => {
    if (!accessToken) nav("/login");
  }, [accessToken, nav]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!accessToken) return;
      setError("");
      try {
        const data = await apiFetch("/tests/start", {
          method: "POST",
          token: accessToken,
          body: { testId, sessionId }
        });
        if (cancelled) return;
        setTest(data.test);
        setAttempt(data.attempt);
        setRevision(data.attempt.revision || 0);

        // question bank uses /questions/byIds on backend (back-compat also exists)
        const qData = await apiFetch("/api/questions/byIds", {
          method: "POST",
          token: accessToken,
          body: { ids: data.attempt.questionIds }
        });
        if (cancelled) return;
        setQuestions(qData.items || []);

        const m = new Map();
        for (const a of data.attempt.answers || []) {
          m.set(String(a.questionId), {
            selectedOptionKey: a.selectedOptionKey,
            numericalValue: a.numericalValue,
            markForReview: !!a.markForReview,
            timeSpentMs: Number(a.timeSpentMs || 0)
          });
        }
        setAnswers(m);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [accessToken, sessionId, testId]);

  const endsAt = attempt?.endsAt;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = endsAt ? msLeft(endsAt) : 0;

  function finalizeTimeSpentForIndex(idx) {
    const q = questions[idx];
    if (!q) return;
    const now = Date.now();
    const delta = Math.max(0, now - activeQStartedAtRef.current);
    activeQStartedAtRef.current = now;
    const qid = String(q._id);
    setAnswers((m) => {
      const n = new Map(m);
      const prev = n.get(qid) || {};
      n.set(qid, { ...prev, timeSpentMs: Number(prev.timeSpentMs || 0) + delta });
      return n;
    });
  }

  useEffect(() => {
    if (!questions.length) return;
    const prev = lastIndexRef.current;
    if (prev !== currentIndex) {
      finalizeTimeSpentForIndex(prev);
      lastIndexRef.current = currentIndex;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length]);

  async function autosave({ reason = "interval" } = {}) {
    if (!accessToken || !attempt?.id) return;
    setSaving(true);
    try {
      const payloadAnswers = [];
      for (const q of questions) {
        const a = answers.get(String(q._id));
        if (!a) continue;
        payloadAnswers.push({
          questionId: String(q._id),
          subject: q.subject,
          type: q.type,
          selectedOptionKey: a.selectedOptionKey,
          numericalValue: a.numericalValue,
          markForReview: !!a.markForReview,
          timeSpentMs: Math.max(0, Math.floor(Number(a.timeSpentMs || 0)))
        });
      }

      const cheatEvents = cheatQueueRef.current.splice(0, cheatQueueRef.current.length);
      const networkEvents = networkQueueRef.current.splice(0, networkQueueRef.current.length);

      const data = await apiFetch("/tests/autosave", {
        method: "POST",
        token: accessToken,
        body: {
          attemptId: attempt.id,
          sessionId,
          revision,
          currentSectionId: attempt.currentSectionId,
          answers: payloadAnswers,
          cheatEvents,
          networkEvents,
          meta: { reason }
        }
      });

      setRevision(data.revision);
      setLastSavedAt(data.lastSavedAt);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!attempt?.id) return;
    const id = setInterval(() => autosave({ reason: "interval" }), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, revision, questions.length, accessToken]);

  useEffect(() => {
    if (!attempt?.id || !endsAt) return;
    if (remainingMs === 0) {
      autosave({ reason: "time_over" }).finally(() => onSubmit());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, endsAt, attempt?.id]);

  async function onSubmit() {
    if (!accessToken || !attempt?.id) return;
    try {
      const data = await apiFetch("/tests/submit", {
        method: "POST",
        token: accessToken,
        body: {
          attemptId: attempt.id,
          sessionId,
          submitIdempotencyKey: `submit_${Date.now()}_${Math.random().toString(16).slice(2)}`
        }
      });
      alert(`Submitted. Score: ${data.result.score} | Accuracy: ${(data.result.accuracy * 100).toFixed(1)}%`);
      nav("/analytics");
    } catch (e) {
      setError(e.message);
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(String(currentQuestion._id)) || {} : {};

  const paletteStatus = (q) => {
    const a = answers.get(String(q._id));
    if (!a) return "notVisited";
    const attempted =
      (q.type === "MCQ" && typeof a.selectedOptionKey === "string") ||
      (q.type === "NUMERICAL" && typeof a.numericalValue === "number");
    if (a.markForReview && attempted) return "markedAnswered";
    if (a.markForReview) return "marked";
    if (attempted) return "answered";
    return "visited";
  };

  const sections = test?.sections || [];
  const activeSectionId = attempt?.currentSectionId || sections[0]?.sectionId || "";

  const sectionQuestionIndexes = useMemo(() => {
    const sec = sections.find((s) => s.sectionId === activeSectionId);
    if (!sec?.subjects?.length) return questions.map((_, i) => i);
    const allowed = new Set(sec.subjects);
    const idxs = [];
    for (let i = 0; i < questions.length; i += 1) {
      if (allowed.has(questions[i].subject)) idxs.push(i);
    }
    return idxs;
  }, [activeSectionId, questions, sections]);

  function goToQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
  }

  if (!attempt || !test) {
    return (
      <div className="ee-card p-6">
        <div className="text-lg font-semibold">Loading exam interface…</div>
        {error ? <div className="mt-3 text-sm text-rose-400">{error}</div> : null}
      </div>
    );
  }

  return (
    <ExamShell variant={test.exam?.includes("MHT") ? "mhtcet" : "jee"}>
      <div className="border-b border-slate-800 bg-slate-950/40 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-[220px]">
            <div className="text-sm font-semibold tracking-tight">{test.name}</div>
            <div className="text-xs text-slate-400">
              Autosave: {saving ? "saving…" : lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : "—"} • Q{" "}
              {currentIndex + 1}/{questions.length}
            </div>
          </div>
          <TimerBar endsAt={attempt.endsAt} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => autosave({ reason: "manual" })}
              className="ee-btn ee-btn-ghost"
            >
              Save
            </button>
            <button
              onClick={onSubmit}
              className="ee-btn ee-btn-primary"
            >
              Submit
            </button>
          </div>
        </div>
        <div className="mt-2">
          <SectionTabs
            sections={sections}
            activeSectionId={activeSectionId}
            onSwitch={async (sectionId) => {
              setAttempt((a) => ({ ...a, currentSectionId: sectionId }));
              await autosave({ reason: "section_switch" });
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="border-b border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{error}</div>
      ) : null}

      <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-3 p-3 lg:grid-cols-[380px_1fr]">
        <div className="ee-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Question Palette</div>
            <div className="text-xs text-slate-400">Quick navigation</div>
          </div>
          <div className="mt-3">
            <QuestionPaletteVirtual
              indexes={sectionQuestionIndexes}
              getLabel={(idx) => idx + 1}
              getStatus={(idx) => paletteStatus(questions[idx])}
              activeIndex={currentIndex}
              onSelect={(idx) => goToQuestion(idx)}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="ee-palette-btn ee-palette-btn--answered !h-5 !w-5" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="ee-palette-btn ee-palette-btn--marked !h-5 !w-5" /> Marked
            </div>
            <div className="flex items-center gap-2">
              <span className="ee-palette-btn ee-palette-btn--markedAnswered !h-5 !w-5" /> Marked + answered
            </div>
            <div className="flex items-center gap-2">
              <span className="ee-palette-btn ee-palette-btn--visited !h-5 !w-5" /> Visited
            </div>
            <div className="col-span-2 flex items-center gap-2 text-slate-400">
              <span className="ee-palette-btn !h-5 !w-5" /> Not visited
            </div>
          </div>
        </div>

        <div className="ee-card p-3">
          {currentQuestion ? (
            <QuestionPane
              question={currentQuestion}
              answer={currentAnswer}
              onAnswer={(patch) => {
                const qid = String(currentQuestion._id);
                setAnswers((m) => {
                  const n = new Map(m);
                  const prev = n.get(qid) || {};
                  n.set(qid, { ...prev, ...patch });
                  return n;
                });
              }}
              onMarkForReview={() => {
                const qid = String(currentQuestion._id);
                setAnswers((m) => {
                  const n = new Map(m);
                  const prev = n.get(qid) || {};
                  n.set(qid, { ...prev, markForReview: !prev.markForReview });
                  return n;
                });
              }}
              onNavigate={(dir) => {
                const list = sectionQuestionIndexes;
                const pos = list.indexOf(currentIndex);
                const nextPos = dir === "next" ? pos + 1 : pos - 1;
                const nextIdx = list[Math.max(0, Math.min(list.length - 1, nextPos))];
                goToQuestion(nextIdx);
              }}
            />
          ) : (
            <div className="text-sm text-slate-400">No question loaded.</div>
          )}
        </div>
      </div>
    </ExamShell>
  );
}

