import React from "react";

export function SubjectCard({ subject, value, onChange, availableCount = null, disabled = false }) {
  return (
    <div className="rounded-md border border-secondary-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-secondary-900">{subject}</div>
        {typeof availableCount === "number" ? (
          <div className="text-xs text-secondary-600">Available: {availableCount}</div>
        ) : null}
      </div>
      <label className="block text-sm font-medium text-secondary-900 mt-2">
        Questions
        <input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value || 0)))}
          className="w-full mt-1"
        />
      </label>
    </div>
  );
}

export default SubjectCard;
