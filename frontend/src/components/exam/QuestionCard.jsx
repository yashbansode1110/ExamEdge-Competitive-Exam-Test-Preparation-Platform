import React from "react";
import { BlockMath, InlineMath } from "react-katex";
import { OptionButton } from "./OptionButton.jsx";

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
  // New exam-driven mode (integrated with backend question objects)
  question,
  answer,
  onAnswer,
  variant = "jee", // 'jee' | 'mhtcet'
  footer,
}) {
  const dynamicMode = !!question;

  const RenderStatement = ({ q }) => {
    const blocks = q?.statement?.length
      ? q.statement
      : [{ kind: q?.latex ? "LATEX" : "TEXT", value: q?.text || "" }];

    return (
      <div className="space-y-2">
        {blocks.map((b, i) => {
          if (b.kind === "LATEX") return <BlockMath key={i}>{b.value}</BlockMath>;
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {b.value}
            </div>
          );
        })}
      </div>
    );
  };

  if (dynamicMode) {
    const a = answer || {};
    const q = question;
    const isMCQ = q?.type === "MCQ";
    const isNumerical = q?.type === "NUMERICAL";

    const difficultyBadge =
      difficulty || q?.difficulty ? (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            (difficulty || q.difficulty) === "Easy"
              ? "bg-success-100 text-success-700"
              : (difficulty || q.difficulty) === "Medium"
                ? "bg-warning-100 text-warning-700"
                : "bg-error-100 text-error-700"
          }`}
        >
          {difficulty || q.difficulty}
        </span>
      ) : null;

    const selectedOptionKey = a?.selectedOptionKey;

    if (variant === "mhtcet") {
      return (
        <div className="mhtcet-question-card">
          <div className="mhtcet-question-header">
            <div className="mhtcet-question-number">
              Question {questionNumber} of {totalQuestions}
            </div>
          </div>

          <div className="mhtcet-question-body">
            <div className="mhtcet-question-text">
              <RenderStatement q={q} />
            </div>

            {isMCQ && (
              <div className="mhtcet-options-area">
                {(q.options || []).map((opt) => {
                  const label = (
                    <>
                      <span className="font-semibold">{opt.key}.</span>{" "}
                      {q.latex ? <InlineMath>{opt.text}</InlineMath> : opt.text}
                    </>
                  );

                  return (
                    <OptionButton
                      key={opt.key}
                      id={opt.key}
                      label={label}
                      value={opt.key}
                      selected={selectedOptionKey === opt.key}
                      variant="mhtcet"
                      name={`q_${q._id}`}
                      onChange={(val) => onAnswer?.({ selectedOptionKey: val })}
                    />
                  );
                })}
              </div>
            )}

            {isNumerical && (
              <div className="mt-5">
                <div className="text-xs text-secondary-500 mb-1">Numerical Answer</div>
                <input
                  type="text"
                  className="mt-1 w-full"
                  inputMode="decimal"
                  placeholder="Enter numerical value"
                  value={typeof a.numericalValue === "number" ? String(a.numericalValue) : ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onAnswer?.({ numericalValue: v === "" ? undefined : Number(v) });
                  }}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default: JEE mode
  return (
      <div className="question-area">
        <div className="question-header">
          <div className="question-meta">
            <div>
              <div className="text-xs text-secondary-500 mb-1">
                {q?.subject ? q.subject : section ? `Section: ${section}` : null}
              </div>
              <div className="question-number">
                Question {questionNumber} of {totalQuestions}
              </div>
              {(q?.chapter || q?.topic || q?.type) && (
                <div className="mt-1 text-xs text-secondary-600">
                  {q.chapter ? q.chapter : null}
                  {q.chapter && q.topic ? " • " : null}
                  {q.topic ? q.topic : null}
                  {q.type ? ` • ${q.type}` : null}
                </div>
              )}
            </div>
            {difficultyBadge}
          </div>
        </div>

        <div className="question-content">
          <div className="question-text">
            <RenderStatement q={q} />
          </div>

          {hasImage && imageUrl && (
            <img src={imageUrl} alt="Question" className="question-image" />
          )}

          {isMCQ && (
            <div className="options-container">
              {(q.options || []).map((opt) => {
                const label = (
                  <>
                    <span className="font-semibold">{opt.key}.</span>{" "}
                    {q.latex ? <InlineMath>{opt.text}</InlineMath> : opt.text}
                  </>
                );

                return (
                  <OptionButton
                    key={opt.key}
                    id={opt.key}
                    label={label}
                    value={opt.key}
                    selected={selectedOptionKey === opt.key}
                    name={`q_${q._id}`}
                    onChange={(val) => onAnswer?.({ selectedOptionKey: val })}
                  />
                );
              })}
            </div>
          )}

          {isNumerical && (
            <div className="mt-4">
              <div className="text-xs text-secondary-500 mb-1">Numerical Answer</div>
              <input
                type="text"
                className="mt-1 w-full"
                inputMode="decimal"
                placeholder="Enter numerical value"
                value={typeof a.numericalValue === "number" ? String(a.numericalValue) : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  onAnswer?.({ numericalValue: v === "" ? undefined : Number(v) });
                }}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {footer ? footer : null}
      </div>
  );
  }

  // Back-compat mode for existing demo interfaces
  return (
    <div className="question-area">
      <div className="question-header">
        <div className="question-meta">
          <div>
            <div className="text-xs text-secondary-500 mb-1">{section && `Section: ${section}`}</div>
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

        {hasImage && imageUrl && <img src={imageUrl} alt="Question" className="question-image" />}

        <div className="options-container">{children}</div>
      </div>
    </div>
  );
}

export default QuestionCard;
