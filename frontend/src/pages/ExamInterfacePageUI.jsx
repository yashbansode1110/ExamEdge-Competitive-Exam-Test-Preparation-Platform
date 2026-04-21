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
import { CheatingWarningModal } from "../components/exam/CheatingWarningModal.jsx";

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
  const [subjectTimers, setSubjectTimers] = useState({ physics: 0, chemistry: 0, math: 0, biology: 0 });
  const [activeSubject, setActiveSubject] = useState("physics"); // physics | chemistry | math
  const isFiltered = test?.isFiltered === true || test?.type === "filtered";
  const isMht = !isFiltered && test?.exam?.includes("MHT");
  const isSingleSubject = isFiltered || test?.subjects?.length === 1 || (questions.length > 0 && new Set(questions.map(q => String(q.subject || "").toLowerCase())).size === 1);
  const isMhtPcm = isMht && String(test?.exam || "").toUpperCase().includes("PCM") && !isSingleSubject;
  const [sectionStatus, setSectionStatus] = useState({
    pc: "not-started",
    physics: "not-started",
    chemistry: "not-started",
    mathematics: "locked",
    biology: "locked"
  });
  const [sectionTimers, setSectionTimers] = useState({
    pc: 5400,
    physics: 2700,
    chemistry: 2700,
    mathematics: 5400,
    biology: 5400
  });
  const [activeSection, setActiveSection] = useState(null); // null | pc | mathematics
  const [showStartSectionModal, setShowStartSectionModal] = useState(false);
  const [warning, setWarning] = useState({ show: false, type: "" });
  const MAX_WARNINGS = 3;
  const [warningCount, setWarningCount] = useState(0);
  const warningCountRef = useRef(0);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  const showError = useCallback((message) => setError(message), []);
  const sectionSubmitInFlightRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    return () => {
      window.__EXAM_SUBMITTING__ = false;
    };
  }, []);

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
    if (key === "physics" || key === "chemistry") return "pc";
    return key;
  }

  function displaySubjectNameFromKey(key) {
    if (key === "pc") return "Physics + Chemistry";
    if (key === "physics") return "Physics";
    if (key === "chemistry") return "Chemistry";
    if (key === "math") return "Mathematics";
    if (key === "biology") return "Biology";
    return "Physics";
  }

  const handleCheatEvent = useCallback((event) => {
    if (isSubmittingRef.current) return;

    const kind = event?.kind || event?.type || "";
    // Only track specific events
    if (kind !== "FULLSCREEN_EXIT" && kind !== "RIGHT_CLICK_BLOCKED" && kind !== "fullscreen_exit" && kind !== "right_click") return;

    const newCount = warningCountRef.current + 1;
    setWarningCount(newCount);

    if (newCount >= MAX_WARNINGS) {
      alert("Maximum warnings reached. Submitting test automatically.");
      if (!submittedRef.current) {
        submittedRef.current = true;
        // The onSubmit logic handles submission
        const submitFn = async () => {
          try {
            await apiFetch(`/api/test-sessions/${testSessionId}/submit`, {
              method: "POST",
              token: accessToken,
              body: {
                sessionId: examClientSessionId,
                submitIdempotencyKey: `submit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                responses: [], // Let backend figure out what's saved
                timeUsed: 0,
                timeLeft: 0
              },
            });
            nav(`/result/${attempt?.id}`);
          } catch(e) {}
        };
        submitFn();
      }
    } else {
      alert(`Warning ${newCount}/${MAX_WARNINGS}: Do not exit fullscreen or right-click.`);
    }
  }, [accessToken, attempt?.id, examClientSessionId, testSessionId, nav]);

  useExamSecurity({
    channelKey: `examedge_guard_${testSessionId}`,
    sessionId: examClientSessionId,
    isSubmittingRef,
    onCheat: (evt) => {
      cheatQueueRef.current.push(evt);
      setWarning({ show: true, type: evt.kind });
      handleCheatEvent(evt);
    },
    onNetwork: (evt) => networkQueueRef.current.push(evt),
  });

  useEffect(() => {
    if (!accessToken) {
      nav("/login");
      return;
    }
    const agreed = sessionStorage.getItem(`instructions_agreed_${testSessionId}`);
    if (!agreed) {
      nav(`/instructions/${testSessionId}`);
    }
  }, [accessToken, nav, testSessionId]);

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
        if (data.test?.exam?.includes("MHT") && String(data.test?.exam || "").toUpperCase().includes("PCM")) {
          const defaultTimers = { pc: 5400, mathematics: 5400 };
          const rawTimers = data.testSession?.sectionTimers || {};
          const safeTimers = {
            pc: Math.max(0, Number.isFinite(Number(rawTimers.pc)) ? Number(rawTimers.pc) : defaultTimers.pc),
            mathematics: Math.max(
              0,
              Number.isFinite(Number(rawTimers.mathematics)) ? Number(rawTimers.mathematics) : defaultTimers.mathematics
            )
          };
          setSectionTimers({
            pc: safeTimers.pc > 0 ? safeTimers.pc : defaultTimers.pc,
            mathematics: safeTimers.mathematics > 0 ? safeTimers.mathematics : defaultTimers.mathematics
          });

          const defaultStatus = { pc: "not-started", mathematics: "locked" };
          const rawStatus = data.testSession?.sectionStatus || {};
          setSectionStatus({
            pc: rawStatus.pc || defaultStatus.pc,
            mathematics: rawStatus.mathematics || defaultStatus.mathematics
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
              const dt = { pc: 5400, mathematics: 5400 };
              const t = parsed.sectionTimers || {};
              setSectionTimers({
                pc: Math.max(0, Number(t.pc || 0)) || dt.pc,
                mathematics: Math.max(0, Number(t.mathematics || 0)) || dt.mathematics,
              });
            }
            if (parsed?.activeSection) setActiveSection(parsed.activeSection);
            if (parsed?.activeSubject) setActiveSubject(parsed.activeSubject);
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
      activeSection,
      activeSubject
    };
    localStorage.setItem(localBackupKey, JSON.stringify(backup));
  }, [answers, visitedQuestions, subjectTimers, sectionStatus, sectionTimers, activeSection, activeSubject, attempt?.id, localBackupKey]);

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
            ...(isMht && isMhtPcm
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
  }, [attempt?.id, accessToken, testSessionId, isMht, isMhtPcm]);

  const onSubmit = useCallback(async () => {
    if (!accessToken) return;
    if (!examClientSessionId || examClientSessionId.length < 8) {
      setError("Session not ready. Please wait or reload the page.");
      return;
    }
    const currentAttempt = attemptRef.current;
    if (!currentAttempt?.id) return;

    window.__EXAM_SUBMITTING__ = true;
    isSubmittingRef.current = true;

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

  const sections = isFiltered ? [] : (test?.sections || []);
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
    const order = ["pc", "mathematics"];
    return list.filter((k) => k === "pc" || k === "mathematics").sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [questions]);

  const questionIndexesByMhtSection = useMemo(() => {
    const out = { pc: [], mathematics: [] };
    questions.forEach((q, idx) => {
      const k = mhtSectionKeyFromQuestion(q);
      if (!out[k]) out[k] = [];
      out[k].push(idx);
    });
    return out;
  }, [questions]);

  const activeMhtIndexes = useMemo(() => {
    if (!isMhtPcm) return sectionQuestionIndexes; // Use standard linear indexes for non-PCM
    if (activeSection === "pc") {
      if (activeSubject === "chemistry") return subjectQuestionIndexesMap.chemistry || [];
      return subjectQuestionIndexesMap.physics || [];
    }
    if (activeSection === "mathematics") return subjectQuestionIndexesMap.math || [];
    return [];
  }, [isMhtPcm, activeSection, activeSubject, sectionQuestionIndexes, subjectQuestionIndexesMap]);
  const mhtCurrentPos = activeMhtIndexes.indexOf(currentIndex);
  const mhtCanGoBack = mhtCurrentPos > 0;
  const mhtCanGoNext = mhtCurrentPos >= 0 && mhtCurrentPos < activeMhtIndexes.length - 1;
  const mhtOnPrevious = useCallback(() => {
    if (!mhtCanGoBack) return;
    const prevIdx = activeMhtIndexes[mhtCurrentPos - 1];
    if (typeof prevIdx === "number") goToQuestion(prevIdx);
  }, [mhtCanGoBack, activeMhtIndexes, mhtCurrentPos, goToQuestion]);

  const mhtOnNext = useCallback(() => {
    if (!mhtCanGoNext) return;
    const nextIdx = activeMhtIndexes[mhtCurrentPos + 1];
    if (typeof nextIdx === "number") goToQuestion(nextIdx);
  }, [mhtCanGoNext, activeMhtIndexes, mhtCurrentPos, goToQuestion]);

  const onSaveAndNext = useCallback(() => {
    const q = questionsRef.current[currentIndex];
    if (!q) return;

    const qid = String(q._id);

    // Save visited
    setVisitedQuestions((prev) => {
      const next = new Set(prev);
      next.add(qid);
      return next;
    });

    // Move next
    console.log("Index:", currentIndex);
    console.log("Questions:", questions.length);
    if (isMht && isMhtPcm) {
      if (mhtCanGoNext) {
        mhtOnNext();
      }
    } else {
      if (canGoNext) {
        onNext();
      }
    }
  }, [currentIndex, questions.length, isMht, isMhtPcm, mhtCanGoNext, mhtOnNext, canGoNext, onNext]);

  const submitPcSection = useCallback(
    async ({ reason } = { reason: "manual" }) => {
      if (sectionSubmitInFlightRef.current) return;
      sectionSubmitInFlightRef.current = true;
      try {
        setSectionStatus((prev) => ({
          ...prev,
          pc: "completed",
          mathematics: prev.mathematics === "locked" ? "not-started" : prev.mathematics
        }));
        setActiveSection("mathematics");
        setActiveSubject("math");
        const idx = (subjectQuestionIndexesMap.math || [])[0];
        if (typeof idx === "number") goToQuestion(idx);
        await autosave({ reason: reason === "time_over" ? "pc_time_over" : "pc_submit" });
      } finally {
        sectionSubmitInFlightRef.current = false;
      }
    },
    [autosave, goToQuestion, subjectQuestionIndexesMap]
  );

  function handleSectionSwitch(target) {
    if (!isMhtPcm) return;
    if (!target) return;

    // Mathematics tab click
    if (target === "mathematics") {
      const status = sectionStatusRef.current || sectionStatus;
      if (status.pc !== "completed") {
        showError("Section not available yet");
        return;
      }
      if (status.pc === "completed" && status.mathematics === "not-started") {
        setSectionStatus((prev) => ({ ...prev, mathematics: "in-progress" }));
      }
      setActiveSection("mathematics");
      setActiveSubject("math");
      const idx = (subjectQuestionIndexesMap.math || [])[0];
      if (typeof idx === "number") goToQuestion(idx);
      return;
    }

    // Physics/Chemistry toggle inside PC section
    if (target === "physics" || target === "chemistry") {
      const status = sectionStatusRef.current || sectionStatus;
      if (status.pc === "completed") {
        showError("Cannot revisit completed section");
        return;
      }
      if (activeSectionRef.current !== "pc") {
        showError("Cannot revisit completed section");
        return;
      }
      setActiveSubject(target);
      const idx = (subjectQuestionIndexesMap[target] || [])[0];
      if (typeof idx === "number") goToQuestion(idx);
    }
  }

  useEffect(() => {
    if (!isMhtPcm) return;
    if (isSingleSubject) return;
    if (!attempt?.id || !questions.length) return;
    if (activeSectionRef.current) return;
    const status = sectionStatusRef.current || sectionStatus;
    if (status?.pc !== "not-started") return;
    setShowStartSectionModal(true);
  }, [isMhtPcm, isSingleSubject, attempt?.id, questions.length, sectionStatus]);

  // Restore active section on refresh/resume (when backend/local backup has status but activeSection is empty).
  useEffect(() => {
    if (!isMhtPcm) return;
    if (!questions.length) return;
    if (activeSection) return;
    const status = sectionStatusRef.current || sectionStatus;
    if (status?.mathematics === "in-progress") {
      setActiveSection("mathematics");
      setActiveSubject("math");
      return;
    }
    if (status?.pc === "in-progress") {
      setActiveSection("pc");
      setActiveSubject((prev) => (prev === "chemistry" ? "chemistry" : "physics"));
    }
  }, [isMhtPcm, questions.length, activeSection, sectionStatus]);

  useEffect(() => {
    if (!isMhtPcm) return;
    if (!activeSection) return;

    const interval = setInterval(() => {
      setSectionTimers((prev) => ({
        ...prev,
        [activeSection]: Math.max((prev[activeSection] || 0) - 1, 0)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMhtPcm, activeSection]);

  useEffect(() => {
    if (!isMhtPcm) return;
    const cur = activeSectionRef.current;
    if (!cur) return;
    const left = Number(sectionTimers[cur] || 0);
    if (left > 0) return;
    if (cur === "pc") {
      submitPcSection({ reason: "time_over" });
      return;
    }
    if (cur === "mathematics") {
      if (!submittedRef.current) {
        submittedRef.current = true;
        autosave({ reason: "math_time_over" }).finally(() => onSubmit());
      }
    }
  }, [isMhtPcm, sectionTimers, submitPcSection, autosave, onSubmit]);

  const onNextMhtSubject = useCallback(() => {
    if (activeSection !== "pc") return;
    setShowSectionSubmitModal(true);
  }, [activeSection]);

  const handleConfirmSectionSubmit = useCallback(async () => {
    setShowSectionSubmitModal(false);
    await submitPcSection({ reason: "manual" });
  }, [submitPcSection]);

  if (!attempt || !test) {
    return (
      <ExamSecurityLayer
        userId={user?.id || user?._id}
        testAttemptId={attempt?.id}
        onViolation={(type) => setWarning({ show: true, type })}
      >
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
    <ExamSecurityLayer
      userId={user?.id || user?._id}
      testAttemptId={attempt?.id}
      onViolation={(type) => setWarning({ show: true, type })}
    >
      <ExamShell variant={isMht ? "mhtcet" : "jee"}>
      {error ? (
        <div className="mb-2 px-4">
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        </div>
      ) : null}

      {warningCount > 0 && (
        <div className="mb-2 px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            Cheating Warning {warningCount} / {MAX_WARNINGS}: Do not exit fullscreen or right-click. Test will auto-submit on maximum warnings.
          </div>
        </div>
      )}

      {isMht ? (
        <ExamLayoutMHTCET
          testName={test.name}
          endsAt={endsAt}
          secondsLeft={timeLeftSec}
          subjectTimers={sectionTimers}
          activeSection={activeSection}
          activeSubject={activeSubject}
          subjects={mhtSubjects}
          sectionStatus={sectionStatus}
          onSwitchSubject={(target) => handleSectionSwitch(target)}
          totalQuestions={isMhtPcm ? (activeMhtIndexes.length || currentSubjectTotalQuestions) : questions.length}
          currentIndex={isMhtPcm ? Math.max(0, mhtCurrentPos) : currentPos}
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
          onPrevious={isMhtPcm ? mhtOnPrevious : onPrevious}
          onNext={isMhtPcm ? mhtOnNext : onNext}
          onSaveAndNext={onSaveAndNext}
          canGoBack={isMhtPcm ? mhtCanGoBack : canGoBack}
          canGoNext={isMhtPcm ? mhtCanGoNext : canGoNext}
          indexes={isMhtPcm ? activeMhtIndexes : sectionQuestionIndexes}
          getStatusForPalette={getStatusForPalette}
          getPaletteLabel={(idx) => questionNumberByIndex.get(idx) || idx + 1}
          onSelectQuestion={(idx) => goToQuestion(idx)}
          showNextSection={isMhtPcm && activeSection === "pc"}
          onNextSection={onNextMhtSubject}
          nextSectionLabel="Next Section"
          showSubmit={isSingleSubject || activeSection === "mathematics"}
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
          onSaveAndNext={onSaveAndNext}
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
        isOpen={isMhtPcm && showStartSectionModal}
        onClose={() => {}}
        title="Start Physics + Chemistry section?"
        submitLabel="Start"
        closeLabel="Cancel"
        onSubmit={async () => {
          await requestFullscreenSafe();
          setShowStartSectionModal(false);
          setSectionStatus({ pc: "in-progress", mathematics: "locked" });
          setActiveSection("pc");
          setActiveSubject("physics");
          const idx = (subjectQuestionIndexesMap.physics || [])[0];
          if (typeof idx === "number") goToQuestion(idx);
          await autosave({ reason: "pc_start" });
        }}
      >
        <p className="text-sm text-secondary-700">
          This will start the <span className="font-semibold">Physics + Chemistry</span> section. You can switch freely between Physics and Chemistry questions during this section.
        </p>
      </Modal>

      <Modal
        isOpen={showSectionSubmitModal}
        onClose={() => setShowSectionSubmitModal(false)}
        title="Submit Physics + Chemistry Section?"
        submitLabel="Confirm"
        closeLabel="Cancel"
        onSubmit={handleConfirmSectionSubmit}
      >
        <p className="text-sm text-secondary-700">
          Are you sure you want to submit this section? You will not be able to return. You can submit even if partially attempted.
        </p>
      </Modal>

      <CheatingWarningModal
        isOpen={warning.show}
        eventType={warning.type}
        onConfirm={() => setWarning({ show: false, type: "" })}
      />
    </ExamShell>
    </ExamSecurityLayer>
  );
}

export default ExamInterfacePageUI;

