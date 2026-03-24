import React from "react";
import { Button } from "../ui/Button";

/**
 * MHT-CET footer (simple prev/next controls)
 */
export function ExamFooterMHTCET({
  questionNumber,
  totalQuestions,
  canGoBack = true,
  canGoNext = true,
  onPrevious,
  onNext,
}) {
  return (
    <div className="mhtcet-footer">
      <div className="mhtcet-footer-content">
        <div className="mhtcet-question-info">
          Question {questionNumber} of {totalQuestions}
        </div>

        <div className="mhtcet-nav-buttons">
          <Button variant="secondary" size="sm" disabled={!canGoBack} onClick={onPrevious}>
            ← Previous
          </Button>
          <Button variant="primary" size="sm" disabled={!canGoNext} onClick={onNext}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExamFooterMHTCET;

