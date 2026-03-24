import React from "react";
import { TimerBar } from "../TimerBar.jsx";
import { QuestionPaletteVirtual } from "../QuestionPaletteVirtual.jsx";
import { QuestionCard } from "../QuestionCard.jsx";
import { ExamFooter } from "../ExamFooter.jsx";
import { SectionTabs } from "../SectionTabs.jsx";
import { Button } from "../../ui/Button.jsx";

/**
 * JEE Main exam layout:
 * Header (timer + exam name) | Left question palette | Center question card
 */
export function ExamLayoutJEE({
  testName,
  endsAt,
  sections,
  activeSectionId,
  onSwitchSection,
  indexes,
  currentIndex,
  totalQuestions,
  getStatusForPalette,
  onSelectQuestion,
  currentQuestion,
  currentAnswer,
  onAnswer,
  onToggleReview,
  isMarkedForReview,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  onSubmit,
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="jee-header">
        <div className="jee-header-top">
          <div>
            <div className="jee-logo">{testName}</div>
          </div>

          <div className="flex items-center gap-3">
            <TimerBar endsAt={endsAt} />
            <Button variant="danger" size="sm" onClick={onSubmit}>
              Submit
            </Button>
          </div>
        </div>

        {sections?.length ? (
          <div className="mt-2 px-3">
            <SectionTabs
              sections={sections}
              activeSectionId={activeSectionId}
              onSwitch={onSwitchSection}
            />
          </div>
        ) : null}
      </div>

      <div className="grid h-[calc(100vh-140px)] gap-3 p-3 lg:grid-cols-[240px_1fr]">
        {/* Left: Question palette */}
        <aside className="question-palette overflow-hidden h-full">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-secondary-900">Question Palette</div>
              <div className="text-xs text-secondary-600">Navigation</div>
            </div>

            <div className="mt-3">
              <QuestionPaletteVirtual
                indexes={indexes}
                getLabel={(idx) => idx + 1}
                getStatus={getStatusForPalette}
                activeIndex={currentIndex}
                onSelect={onSelectQuestion}
                height={360}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-secondary-700">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-secondary-300 bg-secondary-100" /> Not visited
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-success-500 bg-success-100" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-error-500 bg-error-100" /> Not answered
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-purple-500 bg-purple-100" /> Marked
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Active question */}
        <main className="h-full">
          {currentQuestion ? (
            <QuestionCard
              variant="jee"
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              question={currentQuestion}
              answer={currentAnswer}
              onAnswer={onAnswer}
              footer={
                <ExamFooter
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  canGoBack={canGoBack}
                  canGoNext={canGoNext}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  onMarkForReview={onToggleReview}
                  isMarkedForReview={isMarkedForReview}
                />
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-secondary-200 bg-white p-6 text-secondary-600">
              No question loaded.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ExamLayoutJEE;

