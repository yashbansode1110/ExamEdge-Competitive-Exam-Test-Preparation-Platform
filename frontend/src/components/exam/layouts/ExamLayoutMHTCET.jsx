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
  activeSection = null,
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
  onSaveAndNext,
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

  const isPcmCombinedMode = !!sectionStatus?.pc;
  const isSingleSubject = subjects.length === 1;

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
          {isPcmCombinedMode ? (
            <div className="mb-3 rounded-md border border-secondary-200 bg-white p-3 space-y-3">
              {!isSingleSubject && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSwitchSubject?.("physics")}
                      disabled={activeSection !== "pc" || sectionStatus?.pc === "completed"}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                        activeSection === "pc" && activeSubject === "physics"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-secondary-200 bg-white text-secondary-700"
                      }`}
                    >
                      Physics
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchSubject?.("chemistry")}
                      disabled={activeSection !== "pc" || sectionStatus?.pc === "completed"}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                        activeSection === "pc" && activeSubject === "chemistry"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-secondary-200 bg-white text-secondary-700"
                      }`}
                    >
                      Chemistry
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSwitchSubject?.("mathematics")}
                    disabled={sectionStatus?.mathematics === "locked" || sectionStatus?.pc !== "completed"}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                      activeSection === "mathematics"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : sectionStatus?.mathematics === "locked"
                          ? "border-secondary-200 bg-secondary-50 text-secondary-500 cursor-not-allowed"
                          : "border-secondary-200 bg-white text-secondary-700"
                    }`}
                  >
                    Mathematics
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {isSingleSubject ? (
                  <div className="rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-800">
                    <div className="font-semibold">Time Left</div>
                    <div className="mt-0.5 font-mono">{formatSeconds(secondsLeft)}</div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-800">
                      <div className="font-semibold">Physics + Chemistry Time Left</div>
                      <div className="mt-0.5 font-mono">{formatSeconds(subjectTimers.pc)}</div>
                    </div>
                    <div className="rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-800">
                      <div className="font-semibold">Mathematics Time Left</div>
                      <div className="mt-0.5 font-mono">{formatSeconds(subjectTimers.mathematics)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : subjects.length ? (
            <div className="mb-3 rounded-md border border-secondary-200 bg-white p-3">
              <div className="text-xs font-semibold text-secondary-700 mb-2">Subject-wise timers</div>
              <div className="flex flex-wrap gap-2">
                {!isSingleSubject && subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={true}
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
                    {String(s).toUpperCase()} • {formatSeconds(subjectTimers[s])}
                  </button>
                ))}
                {isSingleSubject && (
                  <div className="px-3 py-1.5 rounded-md border border-secondary-200 bg-white text-xs font-semibold text-secondary-700">
                    Time Left: {formatSeconds(secondsLeft)}
                  </div>
                )}
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
        onSaveAndNext={onSaveAndNext}
        showNextSection={!isSingleSubject && showNextSection}
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

