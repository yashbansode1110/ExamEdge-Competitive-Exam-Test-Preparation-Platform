import React, { useEffect, useRef } from "react";
import { apiFetch } from "../../services/api";

export function ExamSecurityLayer({ userId, testAttemptId, onViolation, children }) {
  const throttleRef = useRef({});

  useEffect(() => {
    if (!testAttemptId || !userId) return;

    const logCheatingEvent = async (type, details = {}) => {
      const now = Date.now();
      const lastTime = throttleRef.current[type] || 0;
      // throttle 3 seconds per event type
      if (now - lastTime < 3000) return;
      throttleRef.current[type] = now;

      // Trigger UI warning if callback provided
      if (onViolation) onViolation(type);

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
        logCheatingEvent("TAB_HIDDEN");
      }
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        if (window.__EXAM_SUBMITTING__) return;
        logCheatingEvent("FULLSCREEN_EXIT");
        // Force re-enter fullscreen
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      logCheatingEvent("COPY_BLOCKED", { action: e.type });
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      if (window.__EXAM_SUBMITTING__) return;
      logCheatingEvent("RIGHT_CLICK_BLOCKED");
    };

    const handleKeyDown = (e) => {
      const key = (e.key || "").toLowerCase();
      
      // Block Escape key exit
      if (key === "escape") {
        e.preventDefault();
      }

      const combo = e.ctrlKey || e.metaKey;
      if (combo && ["c", "v", "x", "a"].includes(key)) {
        e.preventDefault();
        logCheatingEvent("COPY_SHORTCUT_BLOCKED", { key });
      }
    };

    const handleSelectStart = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
    };

    let devtoolsOpen = false;
    const checkDevtools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;

      if (isOpen && !devtoolsOpen) {
        logCheatingEvent("DEVTOOLS_OPEN", { widthDiff, heightDiff });
      }
      devtoolsOpen = isOpen;
    };

    // Multiple tab detection
    const storageKey = "exam_active_session";
    const handleStorage = (e) => {
      if (e.key === storageKey && e.newValue) {
        logCheatingEvent("MULTI_TAB_DETECTED");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("selectstart", handleSelectStart);
    window.addEventListener("resize", checkDevtools);
    window.addEventListener("storage", handleStorage);

    const devtoolsInterval = setInterval(checkDevtools, 2000);

    // Initial fullscreen on click if not already
    const handleFirstClick = () => {
      if (window.__EXAM_SUBMITTING__) return;
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      window.removeEventListener("click", handleFirstClick);
    };
    window.addEventListener("click", handleFirstClick);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("selectstart", handleSelectStart);
      window.removeEventListener("resize", checkDevtools);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("click", handleFirstClick);
      clearInterval(devtoolsInterval);
    };
  }, [testAttemptId, userId, onViolation]);

  return <>{children}</>;
}
