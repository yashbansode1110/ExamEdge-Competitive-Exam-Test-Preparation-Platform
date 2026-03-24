import React from "react";
import { Button } from "../ui/Button";

/**
 * Exam header with timer (MHT-CET style)
 */
export function ExamHeaderMHTCET({
  examName,
  timeRemaining,
  onSubmit,
}) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining <= 600; // 10 minutes
  const isCritical = timeRemaining <= 60; // 1 minute

  return (
    <div className="mhtcet-header">
      <div className="mhtcet-header-content">
        <div className="mhtcet-title">{examName}</div>

        <div className="mhtcet-info">
          <div
            className={`mhtcet-timer ${
              isCritical ? "critical" : isWarning ? "warning" : ""
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={onSubmit}
          >
            End Exam
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExamHeaderMHTCET;
