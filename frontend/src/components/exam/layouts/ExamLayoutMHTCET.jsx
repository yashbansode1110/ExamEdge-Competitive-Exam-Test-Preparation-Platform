import React from "react";
import { TimerBar } from "../TimerBar.jsx";
import { QuestionCard } from "../QuestionCard.jsx";
import { ExamFooterMHTCET } from "../ExamFooterMHTCET.jsx";
import { Button } from "../../ui/Button.jsx";

/**
 * MHT-CET exam layout:
 * Header (timer + exam name) | Question card | Prev/Next footer
 */
export function ExamLayoutMHTCET({
  testName,
  endsAt,
  totalQuestions,
  currentIndex,
  currentQuestion,
  currentAnswer,
  onAnswer,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  onSubmit,
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mhtcet-header">
        <div className="mhtcet-header-content">
          <div className="mhtcet-title">{testName}</div>

          <div className="mhtcet-info">
            <TimerBar endsAt={endsAt} />
            <Button variant="danger" size="sm" onClick={onSubmit}>
              End Exam
            </Button>
          </div>
        </div>
      </div>

      <div className="mhtcet-content">
        <div className="w-full max-w-[700px]">
          {currentQuestion ? (
            <QuestionCard
              variant="mhtcet"
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              question={currentQuestion}
              answer={currentAnswer}
              onAnswer={onAnswer}
            />
          ) : (
            <div className="rounded-lg border border-secondary-200 bg-white p-6 text-secondary-600">
              No question loaded.
            </div>
          )}
        </div>
      </div>

      <ExamFooterMHTCET
        questionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}

export default ExamLayoutMHTCET;

