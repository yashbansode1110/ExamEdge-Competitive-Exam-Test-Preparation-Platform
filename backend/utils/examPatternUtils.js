export const ExamId = Object.freeze({
  JEE_MAIN: "JEE_MAIN",
  MHT_CET_PCM: "MHT_CET_PCM",
  MHT_CET_PCB: "MHT_CET_PCB"
});

export const QuestionType = Object.freeze({
  MCQ: "MCQ",
  NUMERICAL: "NUMERICAL"
});

export const SubjectId = Object.freeze({
  PHYSICS: "PHYSICS",
  CHEMISTRY: "CHEMISTRY",
  MATHEMATICS: "MATHEMATICS",
  BIOLOGY: "BIOLOGY"
});

export const ExamPatterns = Object.freeze({
  [ExamId.JEE_MAIN]: {
    id: ExamId.JEE_MAIN,
    name: "JEE Main",
    durationMs: 3 * 60 * 60 * 1000,
    totalQuestions: 75,
    subjectQuestionCounts: {
      [SubjectId.PHYSICS]: 25,
      [SubjectId.CHEMISTRY]: 25,
      [SubjectId.MATHEMATICS]: 25
    },
    allowedQuestionTypes: [QuestionType.MCQ, QuestionType.NUMERICAL],
    marking: { mode: "UNIFORM_NEGATIVE", correct: 4, wrong: -1, unanswered: 0 },
    sections: [
      { sectionId: "FULL", name: "Full Test", order: 0, durationMs: 3 * 60 * 60 * 1000, subjects: [SubjectId.PHYSICS, SubjectId.CHEMISTRY, SubjectId.MATHEMATICS], hardWindowEnforced: false }
    ]
  },

  [ExamId.MHT_CET_PCM]: {
    id: ExamId.MHT_CET_PCM,
    name: "MHT-CET PCM",
    durationMs: 180 * 60 * 1000,
    totalQuestions: 150,
    subjectQuestionCounts: {
      [SubjectId.PHYSICS]: 50,
      [SubjectId.CHEMISTRY]: 50,
      [SubjectId.MATHEMATICS]: 50
    },
    allowedQuestionTypes: [QuestionType.MCQ],
    marking: {
      mode: "SUBJECT_WEIGHTS",
      weights: {
        [SubjectId.PHYSICS]: { correct: 1, wrong: 0 },
        [SubjectId.CHEMISTRY]: { correct: 1, wrong: 0 },
        [SubjectId.MATHEMATICS]: { correct: 2, wrong: 0 }
      }
    },
    sections: [
      { sectionId: "PC", name: "Physics + Chemistry", order: 0, durationMs: 90 * 60 * 1000, subjects: [SubjectId.PHYSICS, SubjectId.CHEMISTRY], hardWindowEnforced: true },
      { sectionId: "M", name: "Mathematics", order: 1, durationMs: 90 * 60 * 1000, subjects: [SubjectId.MATHEMATICS], hardWindowEnforced: true }
    ]
  },

  [ExamId.MHT_CET_PCB]: {
    id: ExamId.MHT_CET_PCB,
    name: "MHT-CET PCB",
    durationMs: 180 * 60 * 1000,
    totalQuestions: 150,
    subjectQuestionCounts: {
      [SubjectId.PHYSICS]: 50,
      [SubjectId.CHEMISTRY]: 50,
      [SubjectId.BIOLOGY]: 50
    },
    allowedQuestionTypes: [QuestionType.MCQ],
    marking: {
      mode: "SUBJECT_WEIGHTS",
      weights: {
        [SubjectId.PHYSICS]: { correct: 1, wrong: 0 },
        [SubjectId.CHEMISTRY]: { correct: 1, wrong: 0 },
        [SubjectId.BIOLOGY]: { correct: 1, wrong: 0 }
      }
    },
    sections: [
      { sectionId: "PC", name: "Physics + Chemistry", order: 0, durationMs: 90 * 60 * 1000, subjects: [SubjectId.PHYSICS, SubjectId.CHEMISTRY], hardWindowEnforced: true },
      { sectionId: "B", name: "Biology", order: 1, durationMs: 90 * 60 * 1000, subjects: [SubjectId.BIOLOGY], hardWindowEnforced: true }
    ]
  }
});

