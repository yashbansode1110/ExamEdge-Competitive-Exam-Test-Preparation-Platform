import React from "react";
import { BlockMath, InlineMath } from "react-katex";

function RenderStatement({ question }) {
  const blocks = question.statement?.length
    ? question.statement
    : [{ kind: question.latex ? "LATEX" : "TEXT", value: question.text }];
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
}

export function QuestionPane({ question, answer, onAnswer, onMarkForReview, onNavigate }) {
  const a = answer || {};
  const attempted =
    (question.type === "MCQ" && typeof a.selectedOptionKey === "string") ||
    (question.type === "NUMERICAL" && typeof a.numericalValue === "number");

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{question.subject}</span> • {question.chapter} •{" "}
            {question.topic} • {question.type}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Difficulty: <span className="font-semibold text-slate-200">{question.difficulty}</span>
          </div>
        </div>
        <button
          onClick={onMarkForReview}
          className={`ee-btn ${a.markForReview ? "bg-purple-600 text-white hover:bg-purple-500" : "ee-btn-ghost"}`}
        >
          {a.markForReview ? "Unmark Review" : "Mark for Review"}
        </button>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
        <RenderStatement question={question} />
      </div>

      {question.type === "MCQ" ? (
        <div className="space-y-2">
          {(question.options || []).map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2 hover:border-slate-700"
            >
              <input
                type="radio"
                name={`q_${question._id}`}
                checked={a.selectedOptionKey === opt.key}
                onChange={() => onAnswer?.({ selectedOptionKey: opt.key })}
              />
              <div className="text-sm">
                <span className="font-semibold text-slate-300">{opt.key}.</span>{" "}
                {question.latex ? <InlineMath>{opt.text}</InlineMath> : opt.text}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Numerical Answer</div>
          <input
            className="mt-2 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-600"
            placeholder="Enter numerical value"
            value={typeof a.numericalValue === "number" ? String(a.numericalValue) : ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              onAnswer?.({ numericalValue: v === "" ? undefined : Number(v) });
            }}
            inputMode="decimal"
            onCopy={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
          />
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <div className="text-xs text-slate-400">
          Status:{" "}
          <span className="font-semibold text-slate-200">
            {attempted ? "Answered" : "Not answered"}
            {a.markForReview ? " • Marked for review" : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate?.("prev")}
            className="ee-btn ee-btn-ghost"
          >
            Previous
          </button>
          <button
            onClick={() => onNavigate?.("next")}
            className="ee-btn ee-btn-ghost"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

