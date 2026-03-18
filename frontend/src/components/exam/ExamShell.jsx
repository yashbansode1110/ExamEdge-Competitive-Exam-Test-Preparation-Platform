import React from "react";

export function ExamShell({ variant = "jee", children }) {
  const header = variant === "mhtcet" ? "MHT-CET Interface" : "JEE (NTA) Interface";
  const themeClass = variant === "mhtcet" ? "ee-exam-shell--mhtcet" : "ee-exam-shell--jee";

  return (
    <div className={`ee-exam-shell ${themeClass}`}>
      <div className="ee-exam-topbar">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold tracking-tight">ExamEdge</div>
            <div className="ee-exam-badge">
              <span className="text-[10px] uppercase tracking-wider text-slate-300">Mode</span>{" "}
              <span className="text-slate-100">{header}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="ee-muted">Secure mode:</span>
            <span className="text-slate-200">fullscreen • multi-tab • copy/paste blocked</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px]">{children}</div>
    </div>
  );
}

