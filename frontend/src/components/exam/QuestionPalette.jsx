import React, { useMemo } from "react";
import { QuestionPaletteButton } from "./QuestionPaletteButton";

/**
 * Question Palette component (JEE exam interface left panel)
 * @param {Array} questions - Array of question objects with status
 * @param {number} currentQuestion - Currently selected question number
 * @param {function} onQuestionSelect - Callback when question is clicked
 */
export function QuestionPalette({
  questions = [],
  currentQuestion = 1,
  onQuestionSelect,
  sections = [],
}) {
  const groupedQuestions = useMemo(() => {
    if (sections.length === 0) {
      return [{ name: "All Questions", questions }];
    }

    return sections.map((section) => ({
      name: section.name,
      questions: questions.filter((q) => q.section === section.id),
    }));
  }, [questions, sections]);

  const getStatusCounts = (questionList) => {
    return {
      answered: questionList.filter((q) => q.status === "answered").length,
      notAnswered: questionList.filter((q) => q.status === "not-answered").length,
      markedReview: questionList.filter((q) => q.status === "marked-review").length,
      notVisited: questionList.filter((q) => q.status === "not-visited").length,
    };
  };

  return (
    <div className="question-palette">
      {groupedQuestions.map((group, groupIndex) => {
        const counts = getStatusCounts(group.questions);

        return (
          <div key={groupIndex} className="palette-section">
            <div className="palette-section-title">
              {group.name}
              <div className="text-xs mt-1 font-normal">
                ({group.questions.length} Qs)
              </div>
            </div>

            <div className="palette-buttons">
              {group.questions.map((question) => (
                <QuestionPaletteButton
                  key={question.id}
                  questionNumber={question.number}
                  status={question.status}
                  isActive={question.number === currentQuestion}
                  onClick={() => onQuestionSelect?.(question.number)}
                />
              ))}
            </div>

            {/* Status legend for each section */}
            <div className="px-3 py-2 bg-[#FAFBFC] text-xs space-y-1 border-t border-secondary-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success-500" />
                <span>
                  Answered: {counts.answered}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error-500" />
                <span>
                  Not Answered: {counts.notAnswered}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>
                  Marked: {counts.markedReview}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-400" />
                <span>
                  Not Visited: {counts.notVisited}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default QuestionPalette;
