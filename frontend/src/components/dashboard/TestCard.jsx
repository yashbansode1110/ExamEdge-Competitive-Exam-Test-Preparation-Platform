import React from "react";

/**
 * Test card component for dashboard
 */
export function TestCard({
  testId,
  title,
  examType,
  duration,
  totalQuestions,
  difficulty,
  description,
  onClick,
  status = "available", // available | attempted | completed
}) {
  const statusColors = {
    available: "border-secondary-200 hover:border-primary-300",
    attempted: "border-warning-200 bg-warning-50",
    completed: "border-success-200 bg-success-50",
  };

  const statusBadgeColors = {
    available: "bg-primary-100 text-primary-700",
    attempted: "bg-warning-100 text-warning-700",
    completed: "bg-success-100 text-success-700",
  };

  const statusLabels = {
    available: "Available",
    attempted: "In Progress",
    completed: "Completed",
  };

  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer transition-all duration-200 hover-scale ${statusColors[status]}`}
    >
      <div className="card-body">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
            <p className="text-sm text-secondary-600 mt-1">{examType}</p>
          </div>
          <span className={`badge text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 py-3 border-t border-b border-secondary-200">
          <div>
            <div className="text-xs text-secondary-600 font-medium">Duration</div>
            <div className="text-sm font-semibold text-secondary-900">{duration} min</div>
          </div>
          <div>
            <div className="text-xs text-secondary-600 font-medium">Questions</div>
            <div className="text-sm font-semibold text-secondary-900">{totalQuestions}</div>
          </div>
          <div>
            <div className="text-xs text-secondary-600 font-medium">Difficulty</div>
            <div className={`text-sm font-semibold ${
              difficulty === "Easy"
                ? "text-success-700"
                : difficulty === "Medium"
                  ? "text-warning-700"
                  : "text-error-700"
            }`}>
              {difficulty}
            </div>
          </div>
          <div>
            <div className="text-xs text-secondary-600 font-medium">Pattern</div>
            <div className="text-sm font-semibold text-secondary-900">MCQ</div>
          </div>
        </div>

        {description && (
          <p className="text-sm text-secondary-600">{description}</p>
        )}
      </div>
    </div>
  );
}

export default TestCard;
