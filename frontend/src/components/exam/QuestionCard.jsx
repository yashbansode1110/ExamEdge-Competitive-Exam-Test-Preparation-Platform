import React from "react";

/**
 * Question Card component for displaying exam questions
 */
export function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  imageUrl,
  section,
  difficulty,
  hasImage = false,
  children,
}) {
  return (
    <div className="question-area">
      <div className="question-header">
        <div className="question-meta">
          <div>
            <div className="text-xs text-secondary-500 mb-1">
              {section && `Section: ${section}`}
            </div>
            <div className="question-number">
              Question {questionNumber} of {totalQuestions}
            </div>
          </div>
          {difficulty && (
            <div className="text-xs font-semibold">
              <span
                className={`px-2 py-1 rounded ${
                  difficulty === "Easy"
                    ? "bg-success-100 text-success-700"
                    : difficulty === "Medium"
                      ? "bg-warning-100 text-warning-700"
                      : "bg-error-100 text-error-700"
                }`}
              >
                {difficulty}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="question-content">
        <div className="question-text">{questionText}</div>

        {hasImage && imageUrl && (
          <img src={imageUrl} alt="Question" className="question-image" />
        )}

        <div className="options-container">{children}</div>
      </div>
    </div>
  );
}

export default QuestionCard;
