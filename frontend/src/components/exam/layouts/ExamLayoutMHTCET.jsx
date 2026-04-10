import React from "react";
import { TimerBar } from "../TimerBar.jsx";
import { QuestionCard } from "../QuestionCard.jsx";
import { ExamFooterMHTCET } from "../ExamFooterMHTCET.jsx";
import { Button } from "../../ui/Button.jsx";
import { QuestionPaletteButton } from "../QuestionPaletteButton.jsx";

/**
 * MHT-CET exam layout:
 * Header (timer + exam name) | Question card | Prev/Next footer
 */
export function ExamLayoutMHTCET({
  testName,
  endsAt,
  secondsLeft,
  subjectTimers = {},
  subjects = [],
  activeSubject = "physics",
  onSwitchSubject,
  sectionStatus,
  totalQuestions,
  currentIndex,
  activeQuestionIndex,
  currentQuestion,
  currentAnswer,
  onAnswer,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  onSubmit,
  indexes = [],
  getStatusForPalette,
  getPaletteLabel,
  onSelectQuestion,
  onToggleReview,
  isMarkedForReview = false,
  showNextSection = false,
  onNextSection,
  nextSectionLabel = "Next Subject",
  showSubmit = false
}) {
  function formatSeconds(value) {
    const sec = Math.max(0, Number(value || 0));
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mhtcet-header">
        <div className="mhtcet-header-content">
          <div className="mhtcet-title">{testName}</div>

          <div className="mhtcet-info">
            <TimerBar endsAt={endsAt} secondsLeft={secondsLeft} />
            <Button variant="danger" size="sm" onClick={onSubmit}>
              End Exam
            </Button>
          </div>
        </div>
      </div>

      <div className="mhtcet-content">
        <div className="flex w-full max-w-[980px] gap-4">
          {indexes.length ? (
            <div className="hidden md:block w-[220px] rounded-md border border-secondary-200 bg-white p-3 h-fit sticky top-24 self-start">
              <div className="mb-2 text-xs font-semibold text-secondary-700">Question navigation</div>
              <div className="flex flex-wrap gap-2">
                {indexes.map((idx) => {
                  const number = getPaletteLabel?.(idx) ?? idx + 1;
                  const status = getStatusForPalette?.(idx) || "not-visited";
                  return (
                    <QuestionPaletteButton
                      key={idx}
                      questionNumber={number}
                      status={status}
                      isActive={typeof activeQuestionIndex === "number" && activeQuestionIndex === idx}
                      onClick={() => onSelectQuestion?.(idx)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="w-full max-w-[700px]">
          {subjects.length ? (
            <div className="mb-3 rounded-md border border-secondary-200 bg-white p-3">
              <div className="text-xs font-semibold text-secondary-700 mb-2">Subject-wise timers</div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSwitchSubject?.(s)}
                    disabled={sectionStatus?.[s] === "locked"}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                      activeSubject === s
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : sectionStatus?.[s] === "completed"
                          ? "border-success-200 bg-success-50 text-success-700"
                          : sectionStatus?.[s] === "locked"
                            ? "border-secondary-200 bg-secondary-50 text-secondary-500 cursor-not-allowed"
                            : "border-secondary-200 bg-white text-secondary-700"
                    }`}
                  >
                    {s.toUpperCase()} • {formatSeconds(subjectTimers[s])}
                    {sectionStatus?.[s] ? (
                      <span
                        className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          sectionStatus[s] === "completed"
                            ? "bg-success-100 text-success-700"
                            : sectionStatus[s] === "in-progress"
                              ? "bg-primary-100 text-primary-700"
                              : sectionStatus[s] === "locked"
                                ? "bg-secondary-100 text-secondary-600"
                                : "bg-secondary-100 text-secondary-700"
                        }`}
                      >
                        {sectionStatus[s]}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
          {indexes.length ? (
            <div className="mt-3 rounded-md border border-secondary-200 bg-white p-3 md:hidden">
              <div className="mb-2 text-xs font-semibold text-secondary-700">Question navigation</div>
              <div className="flex flex-wrap gap-2">
                {indexes.map((idx) => {
                  const number = getPaletteLabel?.(idx) ?? idx + 1;
                  const status = getStatusForPalette?.(idx) || "not-visited";
                  return (
                    <QuestionPaletteButton
                      key={idx}
                      questionNumber={number}
                      status={status}
                      isActive={typeof activeQuestionIndex === "number" && activeQuestionIndex === idx}
                      onClick={() => onSelectQuestion?.(idx)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </div>

      <ExamFooterMHTCET
        questionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onPrevious={onPrevious}
        onNext={onNext}
        showNextSection={showNextSection}
        onNextSection={onNextSection}
        nextSectionLabel={nextSectionLabel}
        onToggleReview={onToggleReview}
        isMarkedForReview={isMarkedForReview}
        showSubmit={showSubmit}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default ExamLayoutMHTCET;

