import React from "react";

export function SectionTabs({ sections = [], activeSectionId = "", onSwitch }) {
  if (!sections?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sections
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => {
          const active = s.sectionId === activeSectionId;
          return (
            <button
              key={s.sectionId}
              onClick={() => onSwitch?.(s.sectionId)}
              className={`ee-btn px-3 py-1.5 ${active ? "ee-btn-primary" : "ee-btn-ghost"}`}
            >
              {s.name}
            </button>
          );
        })}
    </div>
  );
}

