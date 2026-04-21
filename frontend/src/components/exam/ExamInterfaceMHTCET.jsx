import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";
import { ExamHeaderMHTCET } from "../components/exam/ExamHeaderMHTCET";
import { QuestionCard } from "../components/exam/QuestionCard";
import { OptionButton } from "../components/exam/OptionButton";

/**
 * MHT-CET Exam Interface - Simple, fast-paced design
 * Focus on clarity and speed
 */
export function ExamInterfaceMHTCET() {
  const { testId } = useParams();
  const navigate = useNavigate();

  // State management
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(5400); // 90 minutes
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(new Set([1]));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questionsData, setQuestionsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sample data - Replace with API call
  useEffect(() => {
    const sampleQuestions = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      text: `Question ${i + 1}: This is a comprehensive multiple choice question about concepts in Chemistry or Biology.`,
      options: [
        { id: "a", label: "Option A" },
        { id: "b", label: "Option B" },
        { id: "c", label: "Option C" },
        { id: "d", label: "Option D" },
      ],
    }));

    setQuestionsData(sampleQuestions);
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    return () => {
      window.__EXAM_SUBMITTING__ = false;
    };
  }, []);

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

  const currentQData = questionsData[currentQuestion - 1];

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: value,
    }));
    setVisited((prev) => new Set(prev).add(currentQuestion));
  };

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

  const handleSubmitExam = async () => {
    window.__EXAM_SUBMITTING__ = true;
    try {
      // Exit fullscreen BEFORE navigation
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}

    navigate("/exam/results", {
      state: {
        answers,
        score: Object.keys(answers).length * 4,
        testId,
      },
    });
  };

  if (loading) {
    return (
      <div className="mhtcet-exam flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
          <p className="text-secondary-700">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-container mhtcet-exam">
      {/* Header */}
      <ExamHeaderMHTCET
        examName="MHT-CET 2024"
        timeRemaining={timeRemaining}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Main Content */}
      <div className="mhtcet-content">
        <div className="mhtcet-question-card">
          {/* Question Header */}
          <div className="mhtcet-question-header">
            <div className="mhtcet-question-number">
              Question {currentQuestion} of {questionsData.length}
            </div>
          </div>

          {/* Question Body */}
          <div className="mhtcet-question-body">
            {currentQData && (
              <>
                <div className="mhtcet-question-text">
                  {currentQData.text}
                </div>

                {/* Options */}
                <div className="mhtcet-options-area">
                  {currentQData.options.map((option) => (
                    <label
                      key={option.id}
                      className={`mhtcet-option ${
                        answers[currentQuestion] === option.id ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="mhtcet-option"
                        value={option.id}
                        checked={answers[currentQuestion] === option.id}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="mhtcet-option-radio"
                      />
                      <span className="mhtcet-option-text">{option.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer with Navigation */}
          <div className="mhtcet-footer">
            <div className="mhtcet-footer-content">
              <div className="mhtcet-question-info">
                {answers[currentQuestion]
                  ? "✓ Answered"
                  : "Not answered"}
              </div>

              <div className="mhtcet-nav-buttons">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentQuestion === 1}
                  onClick={handlePrevious}
                >
                  ← Previous
                </Button>

                {currentQuestion === questionsData.length ? (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    End Exam
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                  >
                    Next →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="End Exam?"
        submitLabel="Submit"
        closeLabel="Continue"
        onSubmit={handleSubmitExam}
      >
        <div className="space-y-3">
          <Alert variant="warning" title="Confirm Submission">
            You are about to submit your exam. You cannot make changes after submission.
          </Alert>

          <div className="py-3 text-center">
            <div className="text-sm text-secondary-600 mb-1">Questions Answered</div>
            <div className="text-4xl font-bold text-primary-700">
              {Object.keys(answers).length} / {questionsData.length}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ExamInterfaceMHTCET;
