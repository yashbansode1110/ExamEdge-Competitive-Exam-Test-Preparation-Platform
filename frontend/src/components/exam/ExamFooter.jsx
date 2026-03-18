import React from "react";
import { Button } from "../ui/Button";

/**
 * Exam footer with navigation buttons
 */
export function ExamFooter({
  questionNumber,
  totalQuestions,
  canGoBack = true,
  canGoNext = true,
  onPrevious,
  onNext,
  onMarkForReview,
  isMarkedForReview = false,
}) {
  return (
    <div className="exam-footer">
      <div className="question-counter">
        Question {questionNumber} of {totalQuestions}
      </div>

      <div className="nav-buttons">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoBack}
          onClick={onPrevious}
        >
          ← Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onMarkForReview}
          className={isMarkedForReview ? "ring-2 ring-primary-400" : ""}
        >
          {isMarkedForReview ? "✓ Marked for Review" : "Mark for Review"}
        </Button>

        <Button
          variant="primary"
          size="sm"
          disabled={!canGoNext}
          onClick={onNext}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

export default ExamFooter;
