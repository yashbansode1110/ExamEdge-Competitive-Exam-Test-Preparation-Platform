import { useEffect, useRef } from "react";

export function useExamSecurity({ channelKey, sessionId, onCheat, onNetwork, isSubmittingRef }) {
  const lastEventRef = useRef({});

  useEffect(() => {
    const pushCheat = (kind, meta) => {
      const now = Date.now();
      const last = lastEventRef.current[kind] || 0;
      if (now - last < 3000) return; // 3 sec throttle
      lastEventRef.current[kind] = now;
      onCheat?.({ kind, ts: new Date().toISOString(), meta: meta || {} });
    };
    const pushNet = (kind, meta) => onNetwork?.({ kind, ts: new Date().toISOString(), meta: meta || {} });

    function onContextMenu(e) {
      e.preventDefault();
      if (window.__EXAM_SUBMITTING__) return;
      pushCheat("RIGHT_CLICK_BLOCKED");
    }
    function onCopy(e) {
      e.preventDefault();
      pushCheat("COPY_BLOCKED");
    }
    function onPaste(e) {
      e.preventDefault();
      pushCheat("PASTE_BLOCKED");
    }
    function onCut(e) {
      e.preventDefault();
      pushCheat("CUT_BLOCKED");
    }
    function onVisibility() {
      if (document.hidden) pushCheat("TAB_HIDDEN");
    }
    function onBlur() {
      pushCheat("WINDOW_BLUR");
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        if (window.__EXAM_SUBMITTING__ || isSubmittingRef?.current) return;
        pushCheat("FULLSCREEN_EXIT");
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
    function onSelectStart(e) {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      pushCheat("TEXT_SELECTION_BLOCKED");
    }

    function onKeyDown(e) {
      const key = (e.key || "").toLowerCase();
      if (key === "escape") {
        e.preventDefault();
      }

      // Block common exam shortcuts that enable copying content.
      const combo = e.ctrlKey || e.metaKey;
      if (!combo) return;

      if (key === "c") {
        e.preventDefault();
        pushCheat("COPY_SHORTCUT_BLOCKED");
      } else if (key === "v") {
        e.preventDefault();
        pushCheat("PASTE_SHORTCUT_BLOCKED");
      } else if (key === "x") {
        e.preventDefault();
        pushCheat("CUT_SHORTCUT_BLOCKED");
      }
    }

    function onDragStart(e) {
      e.preventDefault();
      pushCheat("DRAG_BLOCKED");
    }

    function onDrop(e) {
      e.preventDefault();
      pushCheat("DROP_BLOCKED");
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("drop", onDrop);
    document.addEventListener("dragover", onDrop);

    const onOnline = () => pushNet("ONLINE");
    const onOffline = () => pushNet("OFFLINE");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const bc = new BroadcastChannel(channelKey);
    bc.postMessage({ kind: "HELLO", sessionId });
    bc.onmessage = (ev) => {
      if (ev?.data?.kind === "HELLO" && ev.data.sessionId !== sessionId) {
        pushCheat("MULTI_TAB_DETECTED", { otherSessionId: ev.data.sessionId });
      }
    };

    const onFirstClick = async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch {
        // ignore
      } finally {
        window.removeEventListener("click", onFirstClick);
      }
    };
    window.addEventListener("click", onFirstClick);

    return () => {
      bc.close();
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("dragover", onDrop);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("click", onFirstClick);
    };
  }, [channelKey, sessionId, onCheat, onNetwork]);
}

