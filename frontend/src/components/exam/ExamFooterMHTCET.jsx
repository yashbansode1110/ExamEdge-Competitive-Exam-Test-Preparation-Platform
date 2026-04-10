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
  showNextSection = false,
  onNextSection,
  nextSectionLabel = "Next Subject",
  onToggleReview,
  isMarkedForReview = false,
  showSubmit = false,
  onSubmit
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
          <Button type="button" variant={isMarkedForReview ? "primary" : "outline"} size="sm" onClick={onToggleReview}>
            {isMarkedForReview ? "Marked for Review" : "Mark for Review"}
          </Button>
          {showSubmit ? (
            <Button variant="danger" size="sm" onClick={onSubmit}>
              Submit Test
            </Button>
          ) : showNextSection ? (
            <Button variant="primary" size="sm" onClick={onNextSection}>
              {nextSectionLabel} →
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={!canGoNext} onClick={onNext}>
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamFooterMHTCET;

