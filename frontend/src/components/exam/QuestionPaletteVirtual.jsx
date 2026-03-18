import React, { useMemo, useRef, useState } from "react";

const ITEM = 36; // px
const GAP = 8;
const COLS = 6; // NTA-ish grid density

function statusClass(s, active) {
  const base = "ee-palette-btn";
  const a = active ? " ee-palette-btn--active" : "";
  if (s === "answered") return `${base} ee-palette-btn--answered${a}`;
  if (s === "marked") return `${base} ee-palette-btn--marked${a}`;
  if (s === "markedAnswered") return `${base} ee-palette-btn--markedAnswered${a}`;
  if (s === "visited") return `${base} ee-palette-btn--visited${a}`;
  return `${base}${a}`;
}

export function QuestionPaletteVirtual({ indexes = [], getLabel, getStatus, activeIndex, onSelect }) {
  const scrollerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const height = 360;

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
      className="ee-palette"
      style={{ height, overflow: "auto" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visible.map((v) => {
          const top = v.r * (ITEM + GAP);
          const left = v.c * (ITEM + GAP);
          const s = getStatus?.(v.idx);
          const label = getLabel?.(v.idx) ?? String(v.idx + 1);
          const active = v.idx === activeIndex;
          return (
            <button
              key={`${v.idx}_${v.i}`}
              onClick={() => onSelect?.(v.idx)}
              className={statusClass(s, active)}
              style={{ position: "absolute", top, left }}
              title={`Q${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

