import React, { useMemo, useRef, useState } from "react";
import { QuestionPaletteButton } from "./QuestionPaletteButton.jsx";

const ITEM = 40; // px (matches .question-btn w-10/h-10)
const GAP = 8;
const COLS = 6; // NTA-ish grid density

export function QuestionPaletteVirtual({
  indexes = [],
  getLabel,
  getStatus,
  activeIndex,
  onSelect,
  height = 360,
}) {
  const scrollerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rows = Math.ceil(indexes.length / COLS);
  const totalHeight = rows * (ITEM + GAP);

  const { startRow, endRow } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / (ITEM + GAP)) - 2);
    const end = Math.min(rows, start + Math.ceil(height / (ITEM + GAP)) + 4);
    return { startRow: start, endRow: end };
  }, [scrollTop, rows]);

  const visible = [];
  for (let r = startRow; r < endRow; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const i = r * COLS + c;
      if (i >= indexes.length) break;
      visible.push({ i, r, c, idx: indexes[i] });
    }
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="w-full"
      style={{ height, overflow: "auto" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visible.map((v) => {
          const top = v.r * (ITEM + GAP);
          const left = v.c * (ITEM + GAP);
          const status = getStatus?.(v.idx);
          const questionNumber = getLabel?.(v.idx) ?? v.idx + 1;
          const active = v.idx === activeIndex;
          return (
            <div
              key={`${v.idx}_${v.i}`}
              style={{ position: "absolute", top, left, width: ITEM, height: ITEM }}
            >
              <QuestionPaletteButton
                questionNumber={questionNumber}
                status={status}
                isActive={active}
                onClick={() => onSelect?.(v.idx)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

