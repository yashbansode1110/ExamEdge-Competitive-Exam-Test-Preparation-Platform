import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";
import { ExamHeaderJEE } from "../components/exam/ExamHeaderJEE";
import { ExamFooter } from "../components/exam/ExamFooter";
import { QuestionCard } from "../components/exam/QuestionCard";
import { OptionButton } from "../components/exam/OptionButton";
import { QuestionPalette } from "../components/exam/QuestionPalette";

/**
 * JEE Exam Interface - Matches real NTA exam UI
 * Layout: Header | (LeftPanel | MainContent) | Footer
 */
export function ExamInterfaceJEE() {
  const { testId } = useParams();
  const navigate = useNavigate();

  // State management
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(10800); // 180 minutes
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visited, setVisited] = useState(new Set([1]));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [error, setError] = useState("");
  const [questionsData, setQuestionsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sample data - Replace with API call
  useEffect(() => {
    const sampleQuestions = Array.from({ length: 90 }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      section: ["Mathematics", "Physics", "Chemistry"][Math.floor(i / 30)],
      sectionId: Math.floor(i / 30),
      text: `Question ${i + 1}: This is a sample question about advanced concepts in ${["Mathematics", "Physics", "Chemistry"][Math.floor(i / 30)]}.`,
      options: [
        { id: "a", label: "Option A - This is the first choice" },
        { id: "b", label: "Option B - This is the second choice" },
        { id: "c", label: "Option C - This is the third choice" },
        { id: "d", label: "Option D - This is the fourth choice" },
      ],
      difficulty: ["Easy", "Medium", "Hard"][Math.floor(Math.random() * 3)],
    }));

    setQuestionsData(sampleQuestions);
    setLoading(false);
  }, [testId]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get current question data
  const currentQData = questionsData[currentQuestion - 1];

  // Handle answer change
  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: value,
    }));
    setVisited((prev) => new Set(prev).add(currentQuestion));
  };

  // Handle navigation
  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questionsData.length) {
      setCurrentQuestion(currentQuestion + 1);
      setVisited((prev) => new Set(prev).add(currentQuestion + 1));
    }
  };

  const handleGoToQuestion = (questionNumber) => {
    setCurrentQuestion(questionNumber);
    setVisited((prev) => new Set(prev).add(questionNumber));
  };

  // Handle mark for review
  const handleMarkForReview = () => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  // Handle submit exam
  const handleSubmitExam = () => {
    // TODO: Send answers to backend
    navigate("/exam/results", {
      state: {
        answers,
        score: Object.keys(answers).length * 4,
        testId,
      },
    });
  };

  // Get question status
  const getQuestionStatus = (qNum) => {
    if (markedForReview.has(qNum)) return "marked-review";
    if (answers[qNum]) return "answered";
    if (visited.has(qNum)) return "not-answered";
    return "not-visited";
  };

  // Prepare questions for palette
  const paletteQuestions = questionsData.map((q) => ({
    id: q.id,
    number: q.number,
    status: getQuestionStatus(q.number),
    section: q.sectionId,
  }));

  const sections = [
    { id: 0, name: "Math" },
    { id: 1, name: "Physics" },
    { id: 2, name: "Chemistry" },
  ];

  if (loading) {
    return (
      <div className="jee-exam flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
          <p className="text-secondary-700">Loading exam...</p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const notAnsweredCount = visited.size - answeredCount - markedForReview.size;

  return (
    <div className="exam-container jee-exam">
      {/* Header */}
      <ExamHeaderJEE
        examName="JEE Main 2024"
        timeRemaining={timeRemaining}
        questionsAnswered={answeredCount}
        totalQuestions={questionsData.length}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Main Content */}
      <div className="jee-content">
        {/* Left Panel - Question Palette */}
        <QuestionPalette
          questions={paletteQuestions}
          currentQuestion={currentQuestion}
          onQuestionSelect={handleGoToQuestion}
          sections={sections}
        />

        {/* Main Area - Question */}
        {currentQData && (
          <QuestionCard
            questionNumber={currentQuestion}
            totalQuestions={questionsData.length}
            section={currentQData.section}
            difficulty={currentQData.difficulty}
            questionText={currentQData.text}
          >
            {currentQData.options.map((option) => (
              <OptionButton
                key={option.id}
                id={option.id}
                label={option.label}
                value={option.id}
                selected={answers[currentQuestion] === option.id}
                onChange={handleAnswerChange}
              />
            ))}
          </QuestionCard>
        )}
      </div>

      {/* Footer */}
      <ExamFooter
        questionNumber={currentQuestion}
        totalQuestions={questionsData.length}
        canGoBack={currentQuestion > 1}
        canGoNext={currentQuestion < questionsData.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onMarkForReview={handleMarkForReview}
        isMarkedForReview={markedForReview.has(currentQuestion)}
      />

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Exam?"
        submitLabel="Submit"
        closeLabel="Continue Taking Exam"
        onSubmit={handleSubmitExam}
      >
        <div className="space-y-3">
          <Alert variant="warning" title="Are you sure?">
            You cannot undo exam submission. Make sure you've reviewed all questions.
          </Alert>

          <div className="grid grid-cols-2 gap-4 py-3">
            <div className="text-center p-3 bg-success-50 rounded-lg">
              <div className="text-sm text-secondary-600">Answered</div>
              <div className="text-2xl font-bold text-success-700">{answeredCount}</div>
            </div>
            <div className="text-center p-3 bg-error-50 rounded-lg">
              <div className="text-sm text-secondary-600">Not Answered</div>
              <div className="text-2xl font-bold text-error-700">{questionsData.length - answeredCount}</div>
            </div>
          </div>

          <div className="text-xs text-secondary-600 bg-secondary-50 p-3 rounded-lg">
            <div className="font-semibold mb-2">Summary:</div>
            <div>Time spent: {Math.floor((10800 - timeRemaining) / 60)} minutes</div>
            <div>Marked for review: {markedForReview.size} questions</div>
          </div>
        </div>
      </Modal>

      {error && (
        <Alert
          variant="error"
          dismissible
          onDismiss={() => setError("")}
          className="fixed bottom-4 right-4 max-w-sm"
        >
          {error}
        </Alert>
      )}
    </div>
  );
}

export default ExamInterfaceJEE;
