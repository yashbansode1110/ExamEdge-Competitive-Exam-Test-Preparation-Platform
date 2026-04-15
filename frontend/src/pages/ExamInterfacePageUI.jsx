import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { ExamShell } from "../components/exam/ExamShell.jsx";
import { ExamLayoutJEE } from "../components/exam/layouts/ExamLayoutJEE.jsx";
import { ExamLayoutMHTCET } from "../components/exam/layouts/ExamLayoutMHTCET.jsx";
import { ExamSecurityLayer } from "../components/exam/ExamSecurityLayer.jsx";
import { useExamSecurity } from "../utils/useExamSecurity.js";
import { Modal } from "../components/ui/Modal.jsx";

export function ExamInterfacePageUI() {
  const { testId: testSessionId } = useParams();
  const nav = useNavigate();
  const { accessToken, user } = useSelector((s) => s.auth);

  const [error, setError] = useState("");
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0); // index into `questions`
  const [answers, setAnswers] = useState(() => new Map());
  const [visitedQuestions, setVisitedQuestions] = useState(() => new Set());
  const [revision, setRevision] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSectionSubmitModal, setShowSectionSubmitModal] = useState(false);
  const [completedSections, setCompletedSections] = useState([]);
  const [subjectTimers, setSubjectTimers] = useState({ physics: 0, chemistry: 0, math: 0, biology: 0 });
  const [activeSubject, setActiveSubject] = useState("physics");
  const isMht = test?.exam?.includes("MHT");
  const [sectionStatus, setSectionStatus] = useState({
    physics: "not-started",
    chemistry: "not-started",
    mathematics: "locked",
    biology: "locked"
  });
  const [sectionTimers, setSectionTimers] = useState({
    physics: 2700,
    chemistry: 2700,
    mathematics: 5400,
    biology: 5400
  });
  const [activeSection, setActiveSection] = useState(null); // null | physics | chemistry | mathematics | biology
  const [showStartSectionModal, setShowStartSectionModal] = useState(false);
  const [pendingSectionSwitch, setPendingSectionSwitch] = useState(null);
  const showError = useCallback((message) => setError(message), []);

  const activeQStartedAtRef = useRef(Date.now());
  const lastIndexRef = useRef(0);

  const submittedRef = useRef(false);
  const initializedQuestionRef = useRef(false);
  const cheatQueueRef = useRef([]);
  const networkQueueRef = useRef([]);

  const attemptSessionStorageKey = useMemo(() => `examedge_attempt_session_${testSessionId}`, [testSessionId]);
  const [examClientSessionId, setExamClientSessionId] = useState(() => {
    try {
      return localStorage.getItem(`examedge_attempt_session_${testSessionId}`) || "";
    } catch {
      return "";
    }
  });
  const localBackupKey = useMemo(() => `examedge_session_backup_${testSessionId}`, [testSessionId]);

  const requestFullscreenSafe = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (document.fullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch {
      // ignore fullscreen permission/user-gesture errors
    }
  }, []);

  const answersRef = useRef(answers);
  const revisionRef = useRef(revision);
  const attemptRef = useRef(attempt);
  const questionsRef = useRef(questions);
  const subjectTimersRef = useRef(subjectTimers);
  const sectionStatusRef = useRef(sectionStatus);
  const sectionTimersRef = useRef(sectionTimers);
  const activeSectionRef = useRef(activeSection);
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
  useEffect(() => {
    subjectTimersRef.current = subjectTimers;
  }, [subjectTimers]);
  useEffect(() => {
    sectionStatusRef.current = sectionStatus;
  }, [sectionStatus]);
  useEffect(() => {
    sectionTimersRef.current = sectionTimers;
  }, [sectionTimers]);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  // STEP 1: Debug logs (MHT-CET)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("ACTIVE SECTION:", activeSection);
    // eslint-disable-next-line no-console
    console.log("TIMERS:", sectionTimers);
    // eslint-disable-next-line no-console
    console.log("STATUS:", sectionStatus);
  }, [activeSection, sectionTimers, sectionStatus]);

  function subjectKeyFromQuestion(q) {
    const s = String(q?.subject || "").toLowerCase();
    if (s.includes("physics")) return "physics";
    if (s.includes("chemistry")) return "chemistry";
    if (s.includes("math")) return "math";
    if (s.includes("biology")) return "biology";
    return "physics";
  }

  function mhtSectionKeyFromQuestion(q) {
    const key = subjectKeyFromQuestion(q);
    if (key === "math") return "mathematics";
    return key;
  }

  function displaySubjectNameFromKey(key) {
    if (key === "physics") return "Physics";
    if (key === "chemistry") return "Chemistry";
    if (key === "math") return "Mathematics";
    if (key === "biology") return "Biology";
    return "Physics";
  }

  useExamSecurity({
    channelKey: `examedge_guard_${testSessionId}`,
    sessionId: examClientSessionId,
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
        const data = await apiFetch(`/api/test-sessions/${testSessionId}`, { token: accessToken });
        if (cancelled) return;

        setTest(data.test);
        setAttempt(data.attempt);
        const sid = data.attempt?.sessionId;
        if (sid && typeof sid === "string") {
          setExamClientSessionId(sid);
          try {
            localStorage.setItem(attemptSessionStorageKey, sid);
          } catch {
            // ignore
          }
        }
        setRevision(data.attempt.revision || 0);
        setSubjectTimers(data.testSession?.subjectTimers || { physics: 0, chemistry: 0, math: 0, biology: 0 });
        if (data.test?.exam?.includes("MHT")) {
          // STEP 2: Timer init must never start at 0.
          const defaultTimers = { physics: 2700, chemistry: 2700, mathematics: 5400, biology: 5400 };
          const rawTimers = data.testSession?.sectionTimers || {};
          const safeTimers = {
            physics: Math.max(0, Number.isFinite(Number(rawTimers.physics)) ? Number(rawTimers.physics) : defaultTimers.physics),
            chemistry: Math.max(0, Number.isFinite(Number(rawTimers.chemistry)) ? Number(rawTimers.chemistry) : defaultTimers.chemistry),
            mathematics: Math.max(
              0,
              Number.isFinite(Number(rawTimers.mathematics)) ? Number(rawTimers.mathematics) : defaultTimers.mathematics
            ),
            biology: Math.max(0, Number.isFinite(Number(rawTimers.biology)) ? Number(rawTimers.biology) : defaultTimers.biology)
          };
          // If backend/session had zeros (buggy legacy sessions), fall back to defaults.
          setSectionTimers({
            physics: safeTimers.physics > 0 ? safeTimers.physics : defaultTimers.physics,
            chemistry: safeTimers.chemistry > 0 ? safeTimers.chemistry : defaultTimers.chemistry,
            mathematics: safeTimers.mathematics > 0 ? safeTimers.mathematics : defaultTimers.mathematics,
            biology: safeTimers.biology > 0 ? safeTimers.biology : defaultTimers.biology
          });

          // STEP 3: Strict default locking
          const defaultStatus = { physics: "not-started", chemistry: "not-started", mathematics: "locked", biology: "locked" };
          const rawStatus = data.testSession?.sectionStatus || {};
          setSectionStatus({
            physics: rawStatus.physics || defaultStatus.physics,
            chemistry: rawStatus.chemistry || defaultStatus.chemistry,
            mathematics: rawStatus.mathematics || defaultStatus.mathematics,
            biology: rawStatus.biology || defaultStatus.biology
          });

          setActiveSection(data.testSession?.activeSection ? data.testSession.activeSection : null);
        }

        const qData = await apiFetch("/api/questions/byIds", {
          method: "POST",
          token: accessToken,
          body: { ids: data.attempt.questionIds },
        });
        if (cancelled) return;

        setQuestions(qData.items || []);

        const m = new Map();
        const visited = new Set();
        for (const a of data.attempt.answers || []) {
          m.set(String(a.questionId), {
            selectedOptionKey: a.selectedOptionKey,
            numericalValue: a.numericalValue,
            markForReview: !!a.markForReview,
            timeSpentMs: Number(a.timeSpentMs || 0),
          });
          visited.add(String(a.questionId));
        }
        setAnswers(m);
        setVisitedQuestions(visited);

        try {
          const backup = localStorage.getItem(localBackupKey);
          if (backup) {
            const parsed = JSON.parse(backup);
            if (parsed?.answers) {
              const restored = new Map(parsed.answers);
              setAnswers(restored);
            }
            if (parsed?.visitedQuestions) setVisitedQuestions(new Set(parsed.visitedQuestions));
            if (parsed?.subjectTimers) setSubjectTimers(parsed.subjectTimers);
            if (parsed?.sectionStatus) setSectionStatus(parsed.sectionStatus);
            if (parsed?.sectionTimers) {
              const dt = { physics: 2700, chemistry: 2700, mathematics: 5400, biology: 5400 };
              const t = parsed.sectionTimers || {};
              setSectionTimers({
                physics: Math.max(0, Number(t.physics || 0)) || dt.physics,
                chemistry: Math.max(0, Number(t.chemistry || 0)) || dt.chemistry,
                mathematics: Math.max(0, Number(t.mathematics || 0)) || dt.mathematics,
                biology: Math.max(0, Number(t.biology || 0)) || dt.biology
              });
            }
            if (parsed?.activeSection) setActiveSection(parsed.activeSection);
          }
        } catch {
          // ignore backup parsing errors
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [accessToken, testSessionId, localBackupKey, attemptSessionStorageKey]);

  useEffect(() => {
    if (initializedQuestionRef.current) return;
    if (!questions.length) return;
    // Start exam from Physics question when present; else fallback to first.
    const physicsIdx = questions.findIndex((q) => subjectKeyFromQuestion(q) === "physics");
    const nextIdx = physicsIdx >= 0 ? physicsIdx : 0;
    initializedQuestionRef.current = true;
    setCurrentIndex(nextIdx);
    setActiveSubject(subjectKeyFromQuestion(questions[nextIdx]));
    setAttempt((a) => {
      if (!a || !test?.sections?.length) return a;
      const physicsSection = test.sections.find((s) =>
        (s.subjects || []).some((subj) => String(subj).toLowerCase().includes("physics"))
      );
      if (!physicsSection?.sectionId) return a;
      return { ...a, currentSectionId: physicsSection.sectionId };
    });
  }, [questions, test]);

  const endsAt = attempt?.endsAt;

  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [timerOffsetMs, setTimerOffsetMs] = useState(() => {
    return Number(localStorage.getItem(`ee_timer_offset_${attempt?.id}`) || 0);
  });
  const interfaceMountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isMht && activeSection && timerOffsetMs === 0) {
      const offset = Date.now() - interfaceMountTimeRef.current;
      setTimerOffsetMs(offset);
      if (attempt?.id) localStorage.setItem(`ee_timer_offset_${attempt.id}`, offset.toString());
    }
  }, [isMht, activeSection, timerOffsetMs, attempt?.id]);

  const timeLeftSec = useMemo(() => {
    if (!attempt?.endsAt) return 0;
    if (isMht && !activeSection) {
      return Math.max(0, Math.floor(Number(test?.durationMs || 0) / 1000));
    }
    const t = new Date(attempt.endsAt).getTime() + timerOffsetMs;
    if (Number.isNaN(t)) return 0;
    return Math.max(0, Math.floor((t - Date.now()) / 1000));
  }, [attempt?.endsAt, timeTick, isMht, activeSection, test?.durationMs, timerOffsetMs]);

  const timeLeftSecRef = useRef(0);
  useEffect(() => {
    timeLeftSecRef.current = timeLeftSec;
  }, [timeLeftSec]);

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

  useEffect(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setVisitedQuestions((prev) => {
      const next = new Set(prev);
      next.add(String(q._id));
      return next;
    });
    setActiveSubject(subjectKeyFromQuestion(q));
  }, [currentIndex, questions]);

  const autosave = useCallback(
    async ({ reason = "interval" } = {}) => {
      if (!accessToken) return;
      if (!examClientSessionId || examClientSessionId.length < 8) return;
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
            sessionId: examClientSessionId,
            revision: revisionRef.current,
            currentSectionId: currentAttempt.currentSectionId,
            answers: payloadAnswers,
            cheatEvents,
            networkEvents,
            sectionProgress: sectionStatusRef.current,
            meta: { reason },
          },
        });

        setRevision(data.revision);
      } catch (e) {
        setError(e.message);
      }
    },
    [accessToken, examClientSessionId]
  );

  useEffect(() => {
    if (!attempt?.id) return;
    const backup = {
      answers: [...answers.entries()],
      visitedQuestions: [...visitedQuestions.values()],
      subjectTimers,
      sectionStatus,
      sectionTimers,
      activeSection
    };
    localStorage.setItem(localBackupKey, JSON.stringify(backup));
  }, [answers, visitedQuestions, subjectTimers, sectionStatus, sectionTimers, activeSection, attempt?.id, localBackupKey]);

  useEffect(() => {
    const currentAttempt = attempt?.id ? attempt : null;
    if (!currentAttempt?.id) return;
    const id = setInterval(() => autosave({ reason: "interval" }), 5000);
    return () => clearInterval(id);
  }, [attempt?.id, autosave]);

  useEffect(() => {
    if (!attempt?.id || !test?.exam?.includes("MHT")) return;
    const id = setInterval(() => {
      // Legacy subject timer ticking (kept for older UI pieces). MHT section timers are handled separately.
      setSubjectTimers((prev) => ({ ...prev }));
    }, 1000);
    return () => clearInterval(id);
  }, [attempt?.id, activeSubject, test?.exam]);

  useEffect(() => {
    if (!attempt?.id) return;
    const id = setInterval(async () => {
      try {
        await apiFetch(`/api/test-sessions/${testSessionId}/timers`, {
          method: "POST",
          token: accessToken,
          body: {
            subjectTimers: subjectTimersRef.current,
            ...(isMht
              ? {
                  sectionTimers: sectionTimersRef.current,
                  sectionStatus: sectionStatusRef.current,
                  activeSection: activeSectionRef.current || undefined
                }
              : {})
          }
        });
      } catch {
        // ignore timer sync errors
      }
    }, 10000);
    return () => clearInterval(id);
  }, [attempt?.id, accessToken, testSessionId, isMht]);

  const onSubmit = useCallback(async () => {
    if (!accessToken) return;
    if (!examClientSessionId || examClientSessionId.length < 8) {
      setError("Session not ready. Please wait or reload the page.");
      return;
    }
    const currentAttempt = attemptRef.current;
    if (!currentAttempt?.id) return;

    try {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore fullscreen exit errors
      }
      const payloadResponses = [];
      for (const q of questionsRef.current) {
        const a = answersRef.current.get(String(q._id));
        if (!a) continue;
        const attempted =
          (q.type === "MCQ" && typeof a.selectedOptionKey === "string") ||
          (q.type === "NUMERICAL" && typeof a.numericalValue === "number");
        if (!attempted) continue;
        payloadResponses.push({
          questionId: String(q._id),
          selectedOption: q.type === "MCQ" ? a.selectedOptionKey : a.numericalValue,
          type: q.type,
          timeTaken: Math.max(0, Math.floor(Number(a.timeSpentMs || 0)))
        });
      }
      const computedTimeUsed = payloadResponses.reduce((sum, r) => sum + Number(r.timeTaken || 0), 0);

      const data = await apiFetch(`/api/test-sessions/${testSessionId}/submit`, {
        method: "POST",
        token: accessToken,
        body: {
          sessionId: examClientSessionId,
          submitIdempotencyKey: `submit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          responses: payloadResponses,
          timeUsed: computedTimeUsed,
          timeLeft: timeLeftSecRef.current
        },
      });
      localStorage.removeItem(localBackupKey);
      nav(`/result/${data?.result?.attemptId || data?.attemptId || currentAttempt.id}`);
    } catch (e) {
      setError(e.message);
    }
  }, [accessToken, nav, examClientSessionId, testSessionId, localBackupKey]);

  useEffect(() => {
    if (!attempt?.id || !endsAt) return;
    const endsAtTime = new Date(endsAt).getTime() + timerOffsetMs;
    if (Number.isNaN(endsAtTime)) return;

    const id = setInterval(() => {
      if (submittedRef.current) return;
      if (Date.now() >= endsAtTime) {
        submittedRef.current = true;
        autosave({ reason: "time_over" }).finally(() => onSubmit());
      }
    }, 500);

    return () => clearInterval(id);
  }, [attempt?.id, endsAt, autosave, onSubmit, timerOffsetMs]);

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

  const subjectQuestionIndexesMap = useMemo(() => {
    const out = { physics: [], chemistry: [], math: [], biology: [] };
    questions.forEach((q, idx) => {
      const key = subjectKeyFromQuestion(q);
      if (!out[key]) out[key] = [];
      out[key].push(idx);
    });
    return out;
  }, [questions]);

  const questionNumberByIndex = useMemo(() => {
    const out = new Map();
    Object.values(subjectQuestionIndexesMap).forEach((idxList) => {
      idxList.forEach((idx, position) => {
        out.set(idx, position + 1);
      });
    });
    return out;
  }, [subjectQuestionIndexesMap]);

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
  const currentSubjectKey = currentQuestion ? subjectKeyFromQuestion(currentQuestion) : "physics";
  const currentSubjectIndexes = subjectQuestionIndexesMap[currentSubjectKey] || [];
  const currentSubjectQuestionNumber = currentQuestion ? questionNumberByIndex.get(currentIndex) || 1 : 1;
  const currentSubjectTotalQuestions = currentSubjectIndexes.length || questions.length;

  const getStatusForPalette = useCallback(
    (idx) => {
      const q = questions[idx];
      if (!q) return "not-visited";

      const a = answers.get(String(q._id));
      const visited = visitedQuestions.has(String(q._id));

      const attempted =
        (q.type === "MCQ" && typeof a?.selectedOptionKey === "string") ||
        (q.type === "NUMERICAL" && typeof a?.numericalValue === "number");

      if (a?.markForReview) return "marked-review";
      if (attempted) return "answered";
      if (visited || idx === currentIndex) return "not-answered";
      return "not-visited";
    },
    [answers, currentIndex, questions, visitedQuestions]
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

  const mhtSubjects = useMemo(() => {
    const set = new Set();
    for (const q of questions) set.add(mhtSectionKeyFromQuestion(q));
    const list = [...set];
    const order = ["physics", "chemistry", "mathematics", "biology"];
    list.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return list;
  }, [questions]);

  const questionIndexesByMhtSection = useMemo(() => {
    const out = { physics: [], chemistry: [], mathematics: [], biology: [] };
    questions.forEach((q, idx) => {
      const k = mhtSectionKeyFromQuestion(q);
      if (!out[k]) out[k] = [];
      out[k].push(idx);
    });
    return out;
  }, [questions]);

  const activeMhtIndexes = questionIndexesByMhtSection[activeSection || ""] || [];
  const mhtCurrentPos = activeMhtIndexes.indexOf(currentIndex);
  const mhtCanGoBack = mhtCurrentPos > 0;
  const mhtCanGoNext = mhtCurrentPos >= 0 && mhtCurrentPos < activeMhtIndexes.length - 1;
  const mhtOnPrevious = useCallback(() => {
    if (!mhtCanGoBack) return;
    const prevIdx = activeMhtIndexes[mhtCurrentPos - 1];
    if (typeof prevIdx === "number") goToQuestion(prevIdx);
  }, [mhtCanGoBack, activeMhtIndexes, mhtCurrentPos, goToQuestion]);

  const isSectionCompleted = useCallback(
    (sectionKey) => {
      if (!sectionKey) return false;
      const idxs = questionIndexesByMhtSection[sectionKey] || [];
      return idxs.every((idx) => {
        const q = questions[idx];
        if (!q) return true;
        // The prompt asked for: questions.every(q => answers[q.id] !== undefined);
        const ans = answers.get(String(q._id));
        const visited = visitedQuestions.has(String(q._id));
        return ans !== undefined || visited;
      });
    },
    [questionIndexesByMhtSection, questions, answers, visitedQuestions]
  );

  const mhtOnNext = useCallback(() => {
    if (!mhtCanGoNext) {
      if (isSectionCompleted(activeSection)) {
        console.log(`[DEBUG GUARD] Section completed, modal opens for section: ${activeSection}`);
        setShowSectionSubmitModal(true);
      }
      return;
    }
    const nextIdx = activeMhtIndexes[mhtCurrentPos + 1];
    if (typeof nextIdx === "number") goToQuestion(nextIdx);
  }, [mhtCanGoNext, activeMhtIndexes, mhtCurrentPos, goToQuestion, isSectionCompleted, activeSection]);
  const mhtOrderedSubjects = useMemo(() => {
    const order = ["physics", "chemistry", "mathematics", "biology"];
    return order.filter((s) => mhtSubjects.includes(s));
  }, [mhtSubjects]);
  const mhtNextSubject = useMemo(() => {
    if (!activeSection) return null;
    if (activeSection === "physics") {
      return sectionStatus.chemistry === "locked" ? "chemistry" : (mhtOrderedSubjects.includes("mathematics") && sectionStatus.mathematics !== "completed" ? "mathematics" : null);
    }
    if (activeSection === "chemistry") {
      return sectionStatus.physics === "locked" ? "physics" : (mhtOrderedSubjects.includes("mathematics") && sectionStatus.mathematics !== "completed" ? "mathematics" : null);
    }
    if (sectionStatus.physics === "completed" && sectionStatus.chemistry === "completed") {
      if (mhtOrderedSubjects.includes("mathematics") && sectionStatus.mathematics !== "completed") return "mathematics";
      if (mhtOrderedSubjects.includes("biology") && sectionStatus.biology !== "completed") return "biology";
    }
    return null;
  }, [activeSection, mhtOrderedSubjects, sectionStatus]);
  const onNextMhtSubject = useCallback(() => {
    if (isSectionCompleted(activeSection)) {
      setShowSectionSubmitModal(true);
    } else {
      showError("Complete current section first");
    }
  }, [activeSection, isSectionCompleted]);



  const mhtActivateSection = useCallback(
    (nextSection) => {
      setActiveSection(nextSection);
      setActiveSubject(nextSection === "mathematics" ? "math" : nextSection);
      setSectionStatus((prev) => ({ ...prev, [nextSection]: "in-progress" }));
      const idx = (questionIndexesByMhtSection[nextSection] || [])[0];
      if (typeof idx === "number") goToQuestion(idx);
      setAttempt((a) => {
        if (!a || !test?.sections?.length) return a;
        const targetName = nextSection === "mathematics" ? "math" : nextSection;
        const sec = test.sections.find((s) =>
          (s.subjects || []).some((subj) => String(subj || "").toLowerCase().includes(targetName))
        );
        if (!sec?.sectionId) return a;
        const next = { ...a, currentSectionId: sec.sectionId };
        attemptRef.current = next;
        return next;
      });
    },
    [goToQuestion, questionIndexesByMhtSection, test?.sections]
  );

  // STEP 4: Replace section switching logic (strict MHT-CET flow)
  function handleSectionSwitch(target) {
    if (!target) return;

    // Force first selection
    if (!activeSection) {
      if (target !== "physics" && target !== "chemistry") {
        showError("Section not available yet");
        return;
      }
      setActiveSection(target);
      setSectionStatus((prev) => ({ ...prev, [target]: "in-progress" }));
      const idx = (questionIndexesByMhtSection[target] || [])[0];
      if (typeof idx === "number") goToQuestion(idx);
      return;
    }

    const active = activeSection;
    if (target === active) return;
    if (sectionStatus[target] === "locked") {
      showError("Section not available yet");
      return;
    }
    if (sectionStatus[target] === "completed") {
      showError("Cannot revisit completed section");
      return;
    }

    const isCompleted = isSectionCompleted(active);

    // FIRST update status snapshot before validation branch
    let updatedStatus = {
      ...(sectionStatusRef.current || sectionStatus),
      [active]: isCompleted ? "completed" : "in-progress"
    };
    setSectionStatus(updatedStatus);

    // THEN validate
    if (!isCompleted) {
      showError("Complete current section first");
      return;
    }

    // Unlock logic AFTER update
    if (updatedStatus.physics === "completed" && updatedStatus.chemistry === "completed") {
      updatedStatus.mathematics = "not-started";
      updatedStatus.biology = "not-started";
    }

    // Block locked target (after unlock computation)
    if (updatedStatus[target] === "locked") {
      showError("Section not available yet");
      return;
    }

    let finalUpdated = { ...updatedStatus };
    finalUpdated[target] = finalUpdated[target] === "completed" ? "completed" : "in-progress";

    setPendingSectionSwitch({
      active,
      target,
      updatedStatus: finalUpdated
    });
  }

  useEffect(() => {
    if (!isMht) return;
    if (!attempt?.id || !questions.length) return;
    if (activeSectionRef.current) return;
    setShowStartSectionModal(true);
  }, [isMht, attempt?.id, questions.length]);

  // STEP 2: Exact timer tick logic
  useEffect(() => {
    if (!isMht) return;
    if (!activeSection) return;

    const interval = setInterval(() => {
      setSectionTimers((prev) => ({
        ...prev,
        [activeSection]: Math.max((prev[activeSection] || 0) - 1, 0)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMht, activeSection]);

  useEffect(() => {
    if (!isMht) return;
    const cur = activeSectionRef.current;
    if (!cur) return;
    const left = Number(sectionTimers[cur] || 0);
    if (left > 0) return;

    window.alert(`${cur} time is over`);

    setSectionStatus((prev) => {
      const next = { ...prev, [cur]: "completed" };
      if (next.physics === "completed" && next.chemistry === "completed") {
        if (next.mathematics === "locked") next.mathematics = "not-started";
        if (next.biology === "locked") next.biology = "not-started";
      }
      return next;
    });

    const statusNow = sectionStatusRef.current || {};
    if (cur === "physics" && statusNow.chemistry !== "completed") {
      mhtActivateSection("chemistry");
      return;
    }
    if (cur === "chemistry" && statusNow.physics !== "completed") {
      mhtActivateSection("physics");
      return;
    }
    if ((statusNow.physics === "completed" || cur === "physics") && (statusNow.chemistry === "completed" || cur === "chemistry")) {
      if ((questionIndexesByMhtSection.mathematics || []).length > 0) {
        mhtActivateSection("mathematics");
        return;
      }
      if ((questionIndexesByMhtSection.biology || []).length > 0) {
        mhtActivateSection("biology");
        return;
      }
    }
    setActiveSection(null);
  }, [isMht, sectionTimers, mhtActivateSection]);

  const handleConfirmSectionSubmit = useCallback(async () => {
    setShowSectionSubmitModal(false);
    
    // 1. mark section as completed + update completedSections
    setCompletedSections((prev) => [...prev, activeSection]);
    console.log(`[DEBUG GUARD] Section completes: ${activeSection}`);
    
    let targetSection = null;

    // 2. unlock next section & lock current section
    setSectionStatus((prev) => {
      const nextStatus = { ...prev };
      nextStatus[activeSection] = "completed"; // lock current
      
      if (activeSection === "physics") {
         targetSection = prev.chemistry === "locked" ? "chemistry" : (mhtOrderedSubjects.includes("mathematics") ? "mathematics" : "biology");
      } else if (activeSection === "chemistry") {
         targetSection = prev.physics === "locked" ? "physics" : (mhtOrderedSubjects.includes("mathematics") ? "mathematics" : "biology");
      }

      if (targetSection && nextStatus[targetSection] === "locked") {
        nextStatus[targetSection] = "not-started";
        console.log(`[DEBUG GUARD] Next section unlocks: ${targetSection}`);
      }
      return nextStatus;
    });

    // 3. Navigate
    setTimeout(() => {
      if (targetSection) mhtActivateSection(targetSection);
    }, 0);
    
    await autosave({ reason: "section_submit" });
  }, [activeSection, mhtActivateSection, autosave, mhtOrderedSubjects]);

  if (!attempt || !test) {
    return (
      <ExamSecurityLayer userId={user?.id || user?._id} testAttemptId={attempt?.id}>
        <ExamShell variant={test?.exam?.includes("MHT") ? "mhtcet" : "jee"}>
          <div className="flex items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-lg border border-secondary-200 bg-white p-6 text-secondary-700">
              Loading exam interface…
              {error ? <div className="mt-3 text-sm text-error-600">{error}</div> : null}
            </div>
          </div>
        </ExamShell>
      </ExamSecurityLayer>
    );
  }

  return (
    <ExamSecurityLayer userId={user?.id || user?._id} testAttemptId={attempt?.id}>
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
          secondsLeft={timeLeftSec}
          subjectTimers={sectionTimers}
          activeSubject={activeSection || ""}
          subjects={mhtSubjects}
          sectionStatus={sectionStatus}
          onSwitchSubject={(sectionKey) => handleSectionSwitch(sectionKey)}
          totalQuestions={activeMhtIndexes.length || currentSubjectTotalQuestions}
          currentIndex={Math.max(0, mhtCurrentPos)}
          activeQuestionIndex={currentIndex}
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
          onPrevious={mhtOnPrevious}
          onNext={mhtOnNext}
          canGoBack={mhtCanGoBack}
          canGoNext={mhtCanGoNext}
          indexes={activeMhtIndexes}
          getStatusForPalette={getStatusForPalette}
          getPaletteLabel={(idx) => questionNumberByIndex.get(idx) || idx + 1}
          onSelectQuestion={(idx) => goToQuestion(idx)}
          showNextSection={
            !mhtCanGoNext &&
            activeMhtIndexes.length > 0 &&
            activeSection !== "mathematics" &&
            activeSection !== "biology" &&
            !!mhtNextSubject
          }
          onNextSection={onNextMhtSubject}
          nextSectionLabel={mhtNextSubject ? `Next: ${displaySubjectNameFromKey(mhtNextSubject === "mathematics" ? "math" : mhtNextSubject)}` : "Next Subject"}
          showSubmit={!mhtCanGoNext && activeMhtIndexes.length > 0 && (activeSection === "mathematics" || activeSection === "biology")}
          onSubmit={() => setShowSubmitConfirm(true)}
        />
      ) : (
        <ExamLayoutJEE
          testName={test.name}
          endsAt={endsAt}
          secondsLeft={timeLeftSec}
          sections={sections}
          activeSectionId={activeSectionId}
          onSwitchSection={onSwitchSection}
          indexes={sectionQuestionIndexes}
          currentIndex={currentIndex}
          totalQuestions={currentSubjectTotalQuestions}
          questionNumber={currentSubjectQuestionNumber}
          subjectLabel={displaySubjectNameFromKey(currentSubjectKey)}
          getStatusForPalette={getStatusForPalette}
          getPaletteLabel={(idx) => questionNumberByIndex.get(idx) || idx + 1}
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
          onSubmit={() => setShowSubmitConfirm(true)}
        />
      )}

      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit Test"
        onSubmit={async () => {
          setShowSubmitConfirm(false);
          await onSubmit();
        }}
        submitLabel="Submit"
        closeLabel="Cancel"
      >
        <p className="text-sm text-secondary-700">Are you sure you want to submit the test now?</p>
      </Modal>

      <Modal
        isOpen={isMht && showStartSectionModal}
        onClose={() => {}}
        title="Choose your first section"
        submitLabel={null}
        closeLabel={null}
      >
        <p className="text-sm text-secondary-900 mb-3">Choose your first section: Physics or Chemistry</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-secondary-900 hover:bg-secondary-50"
            onClick={async () => {
              await requestFullscreenSafe();
              setShowStartSectionModal(false);
              setSectionStatus(prev => ({ ...prev, chemistry: "locked", physics: "in-progress" }));
              mhtActivateSection("physics");
            }}
          >
            Physics
          </button>
          <button
            type="button"
            className="rounded-md border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-secondary-900 hover:bg-secondary-50"
            onClick={async () => {
              await requestFullscreenSafe();
              setShowStartSectionModal(false);
              setSectionStatus(prev => ({ ...prev, physics: "locked", chemistry: "in-progress" }));
              mhtActivateSection("chemistry");
            }}
          >
            Chemistry
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!pendingSectionSwitch}
        onClose={() => setPendingSectionSwitch(null)}
        title={pendingSectionSwitch?.active === "physics" || pendingSectionSwitch?.active === "chemistry" ? `Submit ${displaySubjectNameFromKey(pendingSectionSwitch?.active)} section?` : `Start ${displaySubjectNameFromKey(pendingSectionSwitch?.target)} section?`}
        submitLabel="Confirm"
        closeLabel="Cancel"
        onSubmit={async () => {
           const { target, updatedStatus } = pendingSectionSwitch;
           setSectionStatus(updatedStatus);
           setActiveSection(target);
           const idx = (questionIndexesByMhtSection[target] || [])[0];
           if (typeof idx === "number") goToQuestion(idx);
           await autosave({ reason: "section_switch" });
           setPendingSectionSwitch(null);
        }}
      >
        <p className="text-sm text-secondary-700">
           {pendingSectionSwitch?.target === "mathematics" || pendingSectionSwitch?.target === "biology" 
             ? `You are about to start the ${displaySubjectNameFromKey(pendingSectionSwitch?.target)} section. Once you start it, you cannot go back.`
             : `Are you sure you want to submit the ${displaySubjectNameFromKey(pendingSectionSwitch?.active)} section? You will not be able to change your answers.`}
        </p>
      </Modal>
      <Modal
        isOpen={showSectionSubmitModal}
        onClose={() => setShowSectionSubmitModal(false)}
        title={`Submit ${displaySubjectNameFromKey(activeSection)}?`}
        submitLabel="Confirm"
        closeLabel="Cancel"
        onSubmit={handleConfirmSectionSubmit}
      >
        <p className="text-sm text-secondary-700">
          Are you sure you want to submit the {displaySubjectNameFromKey(activeSection)} section? You will not be able to return to it.
        </p>
      </Modal>
    </ExamShell>
    </ExamSecurityLayer>
  );
}

export default ExamInterfacePageUI;

