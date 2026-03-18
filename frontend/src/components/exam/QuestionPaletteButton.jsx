import React from "react";

/**
 * Question Palette Button component
 * Status: 'not-visited' | 'answered' | 'not-answered' | 'marked-review'
 */
export function QuestionPaletteButton({
  questionNumber,
  status = "not-visited",
  isActive = false,
  onClick,
  disabled = false,
}) {
  const statusClasses = {
    "not-visited": "question-btn-not-visited",
    answered: "question-btn-answered",
    "not-answered": "question-btn-not-answered",
    "marked-review": "question-btn-marked-review",
  };

  return (
    <button
      onClick={() => !disabled && onClick?.()}
      disabled={disabled}
      className={`question-btn ${statusClasses[status] || statusClasses["not-visited"]} ${
        isActive ? "question-btn-active" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={`Question ${questionNumber} - ${status}`}
    >
      {questionNumber}
    </button>
  );
}

export default QuestionPaletteButton;
