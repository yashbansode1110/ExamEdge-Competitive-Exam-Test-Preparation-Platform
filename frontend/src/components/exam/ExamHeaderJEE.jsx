import React from "react";
import { Button } from "../ui/Button";

/**
 * Exam header with timer and exam info (JEE style)
 */
export function ExamHeaderJEE({
  examName,
  timeRemaining,
  questionsAnswered,
  totalQuestions,
  onSubmit,
}) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining <= 600; // 10 minutes
  const isCritical = timeRemaining <= 60; // 1 minute

  return (
    <div className="jee-header">
      <div className="jee-header-top">
        <div className="jee-logo">{examName}</div>

        <div className="jee-exam-meta">
          <div className="jee-timer">
            <span className="text-secondary-600">Time Remaining:</span>
            <span
              className={`${
                isCritical
                  ? "jee-timer critical"
                  : isWarning
                    ? "jee-timer warning"
                    : "jee-timer"
              }`}
            >
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          <div className="text-sm text-secondary-700">
            <span>
              {questionsAnswered} / {totalQuestions} answered
            </span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={onSubmit}
          >
            Submit Exam
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExamHeaderJEE;
