import React, { useEffect, useMemo, useState } from "react";

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function msLeft(endsAt) {
  const t = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, t);
}

export function TimerBar({ endsAt }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const left = useMemo(() => (endsAt ? msLeft(endsAt) : 0), [endsAt, tick]);
  const warning = left <= 10 * 60 * 1000; // 10 minutes
  const critical = left <= 60 * 1000; // 1 minute

  return (
    <div className="min-w-[180px] rounded-md border border-secondary-200 bg-white px-3 py-2 text-center shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-secondary-600">Time Left</div>
      <div
        className={`font-mono text-lg font-semibold ${
          critical ? "text-error-600 animate-pulse" : warning ? "text-warning-600" : "text-secondary-900"
        }`}
      >
        {fmt(left)}
      </div>
    </div>
  );
}

