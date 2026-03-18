import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

/**
 * Results page showing exam performance
 */
export function ResultsPage() {
  const location = useLocation();
  const { answer, score, testId } = location.state || {
    score: 0,
  };

  // Mock results data
  const results = {
    score: score || 240,
    maxScore: 300,
    accuracy: 80,
    timeSpent: 125,
    totalTime: 180,
    ranking: 1250,
    totalParticipants: 50000,
    sections: [
      {
        name: "Physics",
        questions: 30,
        correct: 26,
        score: 88,
      },
      {
        name: "Chemistry",
        questions: 30,
        correct: 24,
        score: 80,
      },
      {
        name: "Mathematics",
        questions: 30,
        correct: 20,
        score: 67,
      },
    ],
  };

  const percentile = ((results.ranking / results.totalParticipants) * 100).toFixed(2);

  return (
    <div className="container-centered py-8">
      {/* Results Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-secondary-900 mb-2">
          Exam Complete! 🎉
        </h1>
        <p className="text-lg text-secondary-600">
          Here's how you performed
        </p>
      </div>

      {/* Score Card */}
      <div className="max-w-2xl mx-auto mb-8">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
          <CardBody className="py-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-primary-500 mb-4">
                <div className="text-3xl font-bold text-primary-700">
                  {results.score}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-secondary-900 mb-1">
              Your Score
            </h2>
            <p className="text-lg text-secondary-600 mb-6">
              {results.score} out of {results.maxScore}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-secondary-600">Accuracy</div>
                <div className="text-2xl font-bold text-success-700">
                  {results.accuracy}%
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-600">Time Used</div>
                <div className="text-2xl font-bold text-primary-700">
                  {results.timeSpent}m
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-600">Rank</div>
                <div className="text-2xl font-bold text-warning-700">
                  #{results.ranking}
                </div>
              </div>
            </div>

            <div className="text-sm text-secondary-600">
              You rank in the{" "}
              <span className="font-bold text-primary-700">top {percentile}%</span> nationally
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Section-wise Performance */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary-900 mb-4">
          Section-wise Performance
        </h2>

        <div className="space-y-3">
          {results.sections.map((section) => {
            const percentage = (section.correct / section.questions) * 100;
            return (
              <Card key={section.name}>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-secondary-900">
                      {section.name}
                    </h3>
                    <Badge
                      variant={
                        percentage > 80
                          ? "success"
                          : percentage > 60
                            ? "warning"
                            : "error"
                      }
                    >
                      {section.score}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-secondary-600">
                      {section.correct} correct out of {section.questions}
                    </span>
                    <span className="text-secondary-500">
                      {section.correct}/{section.questions}
                    </span>
                  </div>

                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        percentage > 80
                          ? "bg-success-500"
                          : percentage > 60
                            ? "bg-warning-500"
                            : "bg-error-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardBody className="text-center">
            <div className="text-3xl mb-2">💪</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Strongest Section
            </h3>
            <p className="text-lg font-bold text-success-700">Physics</p>
            <p className="text-sm text-secondary-600">88% accuracy</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-3xl mb-2">📈</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Improvement Area
            </h3>
            <p className="text-lg font-bold text-warning-700">Mathematics</p>
            <p className="text-sm text-secondary-600">Practice more</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-3xl mb-2">⏱️</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Time Efficiency
            </h3>
            <p className="text-lg font-bold text-primary-700">85%</p>
            <p className="text-sm text-secondary-600">Well managed</p>
          </CardBody>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link to="/">
            <Button variant="secondary" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
          <Link to="/analytics">
            <Button variant="outline" className="w-full">
              View Analytics
            </Button>
          </Link>
          <Button variant="primary" className="w-full">
            Retake Exam
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
