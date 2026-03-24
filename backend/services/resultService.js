export function scoreAttempt({ marking, questionsById, answers }) {
  const answerById = new Map((answers || []).map((a) => [a.questionId.toString(), a]));

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let attempted = 0;
  const bySubject = {};

  for (const q of questionsById.values()) {
    if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, wrong: 0, attempted: 0, score: 0 };
    const a = answerById.get(q._id.toString());
    if (!a) continue;

    const isAttempted =
      (q.type === "MCQ" && typeof a.selectedOptionKey === "string") ||
      (q.type === "NUMERICAL" && typeof a.numericalValue === "number");
    if (!isAttempted) continue;

    attempted += 1;
    bySubject[q.subject].attempted += 1;

    let isCorrect = false;
    if (q.type === "MCQ") isCorrect = a.selectedOptionKey === q.correctOptionKey;
    else isCorrect = Math.abs(Number(a.numericalValue) - Number(q.numericalAnswer)) <= 1e-6;

    let pts = 0;
    if (marking.mode === "UNIFORM_NEGATIVE") {
      pts = isCorrect ? Number(marking.correct || 0) : Number(marking.wrong || 0);
    } else if (marking.mode === "SUBJECT_WEIGHTS") {
      const w = marking.weights?.[q.subject] || { correct: 1, wrong: 0 };
      pts = isCorrect ? Number(w.correct || 0) : Number(w.wrong || 0);
    } else {
      pts = isCorrect ? 1 : 0;
    }

    score += pts;
    bySubject[q.subject].score += pts;
    if (isCorrect) {
      correct += 1;
      bySubject[q.subject].correct += 1;
    } else {
      wrong += 1;
      bySubject[q.subject].wrong += 1;
    }
  }

  const accuracy = attempted ? correct / attempted : 0;
  return { score, accuracy, correct, wrong, attempted, bySubject };
}

