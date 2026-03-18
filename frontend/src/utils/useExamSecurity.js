import { useEffect } from "react";

export function useExamSecurity({ channelKey, sessionId, onCheat, onNetwork }) {
  useEffect(() => {
    const pushCheat = (kind, meta) => onCheat?.({ kind, ts: new Date().toISOString(), meta: meta || {} });
    const pushNet = (kind, meta) => onNetwork?.({ kind, ts: new Date().toISOString(), meta: meta || {} });

    function onContextMenu(e) {
      e.preventDefault();
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
      if (!document.fullscreenElement) pushCheat("FULLSCREEN_EXIT");
    }
    function onSelectStart(e) {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      pushCheat("TEXT_SELECTION_BLOCKED");
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("selectstart", onSelectStart);

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
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("click", onFirstClick);
    };
  }, [channelKey, sessionId, onCheat, onNetwork]);
}

