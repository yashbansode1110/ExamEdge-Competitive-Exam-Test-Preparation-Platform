import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { ExamShell } from "../components/exam/ExamShell.jsx";
import { ExamLayoutJEE } from "../components/exam/layouts/ExamLayoutJEE.jsx";
import { ExamLayoutMHTCET } from "../components/exam/layouts/ExamLayoutMHTCET.jsx";
import { useExamSecurity } from "../utils/useExamSecurity.js";

function getOrCreateSessionId(key) {
  const prev = sessionStorage.getItem(key);
  if (prev) return prev;
  const id = (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).toString();
  sessionStorage.setItem(key, id);
  return id;
}

export function ExamInterfacePageUI() {
  const { testId } = useParams();
  const nav = useNavigate();
  const { accessToken } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0); // index into `questions`
  const [answers, setAnswers] = useState(() => new Map());
  const [revision, setRevision] = useState(0);

  const activeQStartedAtRef = useRef(Date.now());
  const lastIndexRef = useRef(0);

  const submittedRef = useRef(false);
  const cheatQueueRef = useRef([]);
  const networkQueueRef = useRef([]);

  const sessionIdKey = useMemo(() => `examedge_test_session_${testId}`, [testId]);
  const sessionId = useMemo(() => getOrCreateSessionId(sessionIdKey), [sessionIdKey]);

  const answersRef = useRef(answers);
  const revisionRef = useRef(revision);
  const attemptRef = useRef(attempt);
  const questionsRef = useRef(questions);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useExamSecurity({
    channelKey: `examedge_guard_${testId}`,
    sessionId,
    onCheat: (evt) => cheatQueueRef.current.push(evt),
    onNetwork: (evt) => networkQueueRef.current.push(evt),
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
          body: { testId, sessionId },
        });
        if (cancelled) return;

        setTest(data.test);
        setAttempt(data.attempt);
        setRevision(data.attempt.revision || 0);

        const qData = await apiFetch("/api/questions/byIds", {
          method: "POST",
          token: accessToken,
          body: { ids: data.attempt.questionIds },
        });
        if (cancelled) return;

        setQuestions(qData.items || []);

        const m = new Map();
        for (const a of data.attempt.answers || []) {
          m.set(String(a.questionId), {
            selectedOptionKey: a.selectedOptionKey,
            numericalValue: a.numericalValue,
            markForReview: !!a.markForReview,
            timeSpentMs: Number(a.timeSpentMs || 0),
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

  const finalizeTimeSpentForIndex = useCallback(
    (idx) => {
      const q = questionsRef.current[idx];
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
    },
    [setAnswers]
  );

  useEffect(() => {
    if (!questions.length) return;
    const prev = lastIndexRef.current;
    if (prev !== currentIndex) {
      finalizeTimeSpentForIndex(prev);
      lastIndexRef.current = currentIndex;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length, finalizeTimeSpentForIndex]);

  const autosave = useCallback(
    async ({ reason = "interval" } = {}) => {
      if (!accessToken) return;
      const currentAttempt = attemptRef.current;
      if (!currentAttempt?.id) return;
      try {
        const payloadAnswers = [];
        for (const q of questionsRef.current) {
          const a = answersRef.current.get(String(q._id));
          if (!a) continue;
          payloadAnswers.push({
            questionId: String(q._id),
            subject: q.subject,
            type: q.type,
            selectedOptionKey: a.selectedOptionKey,
            numericalValue: a.numericalValue,
            markForReview: !!a.markForReview,
            timeSpentMs: Math.max(0, Math.floor(Number(a.timeSpentMs || 0))),
          });
        }

        const cheatEvents = cheatQueueRef.current.splice(0, cheatQueueRef.current.length);
        const networkEvents = networkQueueRef.current.splice(0, networkQueueRef.current.length);

        const data = await apiFetch("/tests/autosave", {
          method: "POST",
          token: accessToken,
          body: {
            attemptId: currentAttempt.id,
            sessionId,
            revision: revisionRef.current,
            currentSectionId: currentAttempt.currentSectionId,
            answers: payloadAnswers,
            cheatEvents,
            networkEvents,
            meta: { reason },
          },
        });

        setRevision(data.revision);
      } catch (e) {
        setError(e.message);
      }
    },
    [accessToken, sessionId]
  );

  useEffect(() => {
    const currentAttempt = attempt?.id ? attempt : null;
    if (!currentAttempt?.id) return;
    const id = setInterval(() => autosave({ reason: "interval" }), 5000);
    return () => clearInterval(id);
  }, [attempt?.id, autosave]);

  const onSubmit = useCallback(async () => {
    if (!accessToken) return;
    const currentAttempt = attemptRef.current;
    if (!currentAttempt?.id) return;

    try {
      const data = await apiFetch("/tests/submit", {
        method: "POST",
        token: accessToken,
        body: {
          attemptId: currentAttempt.id,
          sessionId,
          submitIdempotencyKey: `submit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        },
      });

      const score = data?.result?.score ?? 0;
      const accuracy = data?.result?.accuracy ?? 0;

      nav("/exam/results", {
        state: {
          testId,
          score,
          accuracy,
        },
      });
    } catch (e) {
      setError(e.message);
    }
  }, [accessToken, nav, sessionId, testId]);

  useEffect(() => {
    if (!attempt?.id || !endsAt) return;
    const endsAtTime = new Date(endsAt).getTime();
    if (Number.isNaN(endsAtTime)) return;

    const id = setInterval(() => {
      if (submittedRef.current) return;
      if (Date.now() >= endsAtTime) {
        submittedRef.current = true;
        autosave({ reason: "time_over" }).finally(() => onSubmit());
      }
    }, 500);

    return () => clearInterval(id);
  }, [attempt?.id, endsAt, autosave, onSubmit]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(String(currentQuestion._id)) || {} : {};

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

  const goToQuestion = useCallback(
    (idx) => {
      if (idx < 0 || idx >= questionsRef.current.length) return;
      setCurrentIndex(idx);
    },
    [setCurrentIndex]
  );

  const currentPos = useMemo(() => sectionQuestionIndexes.indexOf(currentIndex), [sectionQuestionIndexes, currentIndex]);
  const canGoBack = currentPos > 0;
  const canGoNext = currentPos >= 0 && currentPos < sectionQuestionIndexes.length - 1;

  const onPrevious = useCallback(() => {
    if (!canGoBack) return;
    const prevIdx = sectionQuestionIndexes[currentPos - 1];
    if (typeof prevIdx === "number") goToQuestion(prevIdx);
  }, [canGoBack, currentPos, sectionQuestionIndexes, goToQuestion]);

  const onNext = useCallback(() => {
    if (!canGoNext) return;
    const nextIdx = sectionQuestionIndexes[currentPos + 1];
    if (typeof nextIdx === "number") goToQuestion(nextIdx);
  }, [canGoNext, currentPos, sectionQuestionIndexes, goToQuestion]);

  const onToggleReview = useCallback(() => {
    const q = questionsRef.current[currentIndex];
    if (!q) return;
    const qid = String(q._id);
    setAnswers((m) => {
      const n = new Map(m);
      const prev = n.get(qid) || {};
      n.set(qid, { ...prev, markForReview: !prev.markForReview });
      return n;
    });
  }, [currentIndex]);

  const isMarkedForReview = !!currentAnswer?.markForReview;

  const getStatusForPalette = useCallback(
    (idx) => {
      const q = questions[idx];
      if (!q) return "not-visited";

      const a = answers.get(String(q._id));

      const attempted =
        (q.type === "MCQ" && typeof a?.selectedOptionKey === "string") ||
        (q.type === "NUMERICAL" && typeof a?.numericalValue === "number");

      if (a?.markForReview) return "marked-review";
      if (attempted) return "answered";
      if (a || idx === currentIndex) return "not-answered";
      return "not-visited";
    },
    [answers, currentIndex, questions]
  );

  const onSwitchSection = useCallback(
    async (sectionId) => {
      setAttempt((a) => {
        if (!a) return a;
        const next = { ...a, currentSectionId: sectionId };
        // Keep ref in sync immediately for autosave(section_switch) correctness.
        attemptRef.current = next;
        return next;
      });
      await autosave({ reason: "section_switch" });
    },
    [autosave]
  );

  if (!attempt || !test) {
    return (
      <ExamShell variant={test?.exam?.includes("MHT") ? "mhtcet" : "jee"}>
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-lg border border-secondary-200 bg-white p-6 text-secondary-700">
            Loading exam interface…
            {error ? <div className="mt-3 text-sm text-error-600">{error}</div> : null}
          </div>
        </div>
      </ExamShell>
    );
  }

  const isMht = test.exam?.includes("MHT");

  return (
    <ExamShell variant={isMht ? "mhtcet" : "jee"}>
      {error ? (
        <div className="mb-2 px-4">
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        </div>
      ) : null}

      {isMht ? (
        <ExamLayoutMHTCET
          testName={test.name}
          endsAt={endsAt}
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          currentQuestion={currentQuestion}
          currentAnswer={currentAnswer}
          onAnswer={(patch) => {
            if (!currentQuestion) return;
            const qid = String(currentQuestion._id);
            setAnswers((m) => {
              const n = new Map(m);
              const prev = n.get(qid) || {};
              n.set(qid, { ...prev, ...patch });
              return n;
            });
          }}
          onPrevious={onPrevious}
          onNext={onNext}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          onSubmit={onSubmit}
        />
      ) : (
        <ExamLayoutJEE
          testName={test.name}
          endsAt={endsAt}
          sections={sections}
          activeSectionId={activeSectionId}
          onSwitchSection={onSwitchSection}
          indexes={sectionQuestionIndexes}
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          getStatusForPalette={getStatusForPalette}
          onSelectQuestion={(idx) => goToQuestion(idx)}
          currentQuestion={currentQuestion}
          currentAnswer={currentAnswer}
          onAnswer={(patch) => {
            if (!currentQuestion) return;
            const qid = String(currentQuestion._id);
            setAnswers((m) => {
              const n = new Map(m);
              const prev = n.get(qid) || {};
              n.set(qid, { ...prev, ...patch });
              return n;
            });
          }}
          onToggleReview={onToggleReview}
          isMarkedForReview={isMarkedForReview}
          onPrevious={onPrevious}
          onNext={onNext}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          onSubmit={onSubmit}
        />
      )}
    </ExamShell>
  );
}

export default ExamInterfacePageUI;

