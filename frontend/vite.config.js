import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindConfig from "./tailwind.config.js";

// #region agent debug logs
// This instrumentation runs during Vite startup (before CSS compilation).
try {
  fetch("http://127.0.0.1:7868/ingest/f7875ee9-6bf1-4a30-950c-5b446e8ae642", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "74645a"
    },
    body: JSON.stringify({
      sessionId: "74645a",
      runId: "pre-fix",
      hypothesisId: "H1_tailwind_fontsize_keys",
      location: "vite.config.js",
      message: "Tailwind fontSize keys from config",
      data: {
        hasFontSizeBaseInExtend: !!tailwindConfig?.theme?.extend?.fontSize?.base,
        fontSizeKeys: Object.keys(tailwindConfig?.theme?.extend?.fontSize || {}),
        bodyApplyLine: "styles.css: body uses @apply ... text-base ..."
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
} catch {
  // ignore
}
// #endregion

function postFixLog() {
  try {
    fetch("http://127.0.0.1:7868/ingest/f7875ee9-6bf1-4a30-950c-5b446e8ae642", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "74645a",
      },
      body: JSON.stringify({
        sessionId: "74645a",
        runId: "post-fix",
        hypothesisId: "H_fix_remove_text_base_apply",
        location: "vite.config.js",
        message: "Vite server started (no Tailwind @apply compilation error observed).",
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "debug-tailwind-postfix",
      configureServer() {
        postFixLog();
      },
    },
  ],
  server: { port: 5173 }
});

