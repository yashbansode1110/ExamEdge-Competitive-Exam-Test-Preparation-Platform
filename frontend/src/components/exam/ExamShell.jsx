import React from "react";

export function ExamShell({ variant = "jee", children }) {
  const themeClass = variant === "mhtcet" ? "mhtcet-exam" : "jee-exam";

  // Root wrapper applies exam security styles globally (selection/drag/copy/paste blocking via hook + CSS).
  return (
    <div className={`exam-container ${themeClass}`}>
      <div className="mx-auto w-full max-w-[1400px]">{children}</div>
    </div>
  );
}

