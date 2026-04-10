function getQuestionSectionName(test, question) {
  const section = (test.sections || []).find((s) => (s.subjects || []).includes(question.subject));
  return section?.name || question.subject || "General";
}

function marksForQuestion({ marking, question, isCorrect, isAttempted }) {
  if (!isAttempted) return Number(marking?.unanswered || 0);

  if (marking?.mode === "UNIFORM_NEGATIVE") {
    return isCorrect ? Number(marking.correct || 0) : -Math.abs(Number(marking.wrong || 0));
  }
  if (marking?.mode === "SUBJECT_WEIGHTS") {
    const w = marking?.weights?.[question.subject] || {};
    return isCorrect ? Number(w.correct || 0) : -Math.abs(Number(w.wrong || 0));
  }
  return isCorrect ? 1 : 0;
}

export function evaluateTestAttempt({ test, questions, answers }) {
  console.log("Evaluating attempt:", (answers || []).length);

  const answerById = new Map((answers || []).map((a) => [a.questionId.toString(), a]));
  const responses = [];
  const sectionStatsMap = new Map();

  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let attemptedCount = 0;
  let timeUsed = 0;

  for (const question of questions || []) {
    const answer = answerById.get(question._id.toString());
    const sectionName = getQuestionSectionName(test, question);
    if (!sectionStatsMap.has(sectionName)) sectionStatsMap.set(sectionName, { sectionName, correct: 0, total: 0, accuracy: 0 });
    const s = sectionStatsMap.get(sectionName);
    s.total += 1;

    const isAttempted =
      !!answer &&
      ((question.type === "MCQ" && typeof answer.selectedOptionKey === "string") ||
        (question.type === "NUMERICAL" && typeof answer.numericalValue === "number"));
    const isCorrect = isAttempted
      ? question.type === "MCQ"
        ? answer.selectedOptionKey === question.correctOptionKey
        : Math.abs(Number(answer.numericalValue) - Number(question.numericalAnswer)) <= 1e-6
      : false;

    const marksAwarded = marksForQuestion({ marking: test.marking || {}, question, isCorrect, isAttempted });
    const positiveMarksForQuestion = marksForQuestion({
      marking: test.marking || {},
      question,
      isCorrect: true,
      isAttempted: true
    });

    totalMarks += Number(positiveMarksForQuestion || 0);
    score += Number(marksAwarded || 0);
    timeUsed += Math.max(0, Number(answer?.timeSpentMs || 0));

    if (isAttempted) {
      attemptedCount += 1;
      if (isCorrect) {
        correctCount += 1;
        s.correct += 1;
      } else {
        wrongCount += 1;
      }
    }

    responses.push({
      questionId: question._id,
      selectedOption: question.type === "MCQ" ? answer?.selectedOptionKey : answer?.numericalValue,
      isCorrect,
      marksAwarded,
      timeTaken: Math.max(0, Number(answer?.timeSpentMs || 0))
    });
  }

  const totalQuestions = (questions || []).length;
  const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
  const accuracy = attemptedCount ? correctCount / attemptedCount : 0;
  const sectionStats = [...sectionStatsMap.values()].map((stat) => ({
    ...stat,
    accuracy: stat.total ? Math.round((stat.correct / stat.total) * 10000) / 100 : 0
  }));

  return {
    responses,
    score,
    totalMarks,
    accuracy,
    correctCount,
    wrongCount,
    unattemptedCount,
    attemptedCount,
    sectionStats,
    timeUsed
  };
}
