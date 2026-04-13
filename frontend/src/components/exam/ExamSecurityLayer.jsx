import React, { useEffect, useRef } from "react";
import { apiFetch } from "../../services/api";

export function ExamSecurityLayer({ userId, testAttemptId, children }) {
  const throttleRef = useRef({});

  useEffect(() => {
    if (!testAttemptId || !userId) return;

    const logCheatingEvent = async (type, details = {}) => {
      const now = Date.now();
      const lastTime = throttleRef.current[type] || 0;
      // throttle 3 seconds per event type
      if (now - lastTime < 3000) return;
      throttleRef.current[type] = now;

      try {
        await apiFetch("/api/cheating/log", {
          method: "POST",
          body: { testAttemptId, eventType: type, details }
        });
      } catch (err) {
        // silent error handling
        console.warn("[Security] Event log failed", err);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        logCheatingEvent("tab_switch");
      }
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        logCheatingEvent("fullscreen_exit");
      }
    };

    const handleCopyPaste = (e) => {
      logCheatingEvent("copy_attempt", { action: e.type });
    };

    const handleContextMenu = (e) => {
      logCheatingEvent("right_click");
    };

    const handleKeyDown = (e) => {
      const key = (e.key || "").toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      if (combo && ["c", "v", "x", "a"].includes(key)) {
        logCheatingEvent("copy_attempt", { key });
      }
    };

    let devtoolsOpen = false;
    const checkDevtools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;

      if (isOpen && !devtoolsOpen) {
        logCheatingEvent("devtools_open", { widthDiff, heightDiff });
      }
      devtoolsOpen = isOpen;
    };

    // Multiple tab detection
    const storageKey = "exam_active_session";
    if (localStorage.getItem(storageKey)) {
      logCheatingEvent("multiple_tab");
    } else {
      localStorage.setItem(storageKey, "true");
    }

    const handleStorage = (e) => {
      // Also catch if another tab sets it while we are open
      if (e.key === storageKey && e.newValue) {
        logCheatingEvent("multiple_tab");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", checkDevtools);
    window.addEventListener("storage", handleStorage);

    const devtoolsInterval = setInterval(checkDevtools, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", checkDevtools);
      window.removeEventListener("storage", handleStorage);
      clearInterval(devtoolsInterval);
      localStorage.removeItem(storageKey);
    };
  }, [testAttemptId, userId]);

  return <>{children}</>;
}
