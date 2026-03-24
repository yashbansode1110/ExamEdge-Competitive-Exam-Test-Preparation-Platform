import React from "react";
import { Button } from "../ui/Button";

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
            <Button
              key={s.sectionId}
              onClick={() => onSwitch?.(s.sectionId)}
              variant={active ? "primary" : "ghost"}
              size="sm"
            >
              {s.name}
            </Button>
          );
        })}
    </div>
  );
}

