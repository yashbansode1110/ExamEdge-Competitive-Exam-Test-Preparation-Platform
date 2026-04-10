import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { apiFetch } from "../services/api.js";

/**
 * Results page showing exam performance
 */
export function ResultsPage() {
  const { accessToken } = useSelector((s) => s.auth);
  const { attemptId } = useParams();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      if (!attemptId) {
        setError("Missing attempt id");
        setLoading(false);
        return;
      }
      setError("");
      setLoading(true);
      try {
        const data = await apiFetch(`/tests/attempts/${attemptId}/result`, { token: accessToken });
        if (!cancelled) setResult(data.result);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load result");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, attemptId]);

  const normalized = useMemo(() => {
    const r = result || {};
    const accuracyPct = Number(r.accuracy || 0) * 100;
    const sections = Array.isArray(r.sectionStats) ? r.sectionStats : [];
    const best = sections.length ? [...sections].sort((a, b) => b.accuracy - a.accuracy)[0] : null;
    const weak = sections.length ? [...sections].sort((a, b) => a.accuracy - b.accuracy)[0] : null;
    return {
      score: Number(r.score || 0),
      totalMarks: Number(r.totalMarks || 0),
      accuracyPct,
      timeSpentMin: Math.round(Number(r.timeUsed || 0) / 60000),
      rank: Number(r.rank || 0),
      correct: Number(r.correct || 0),
      wrong: Number(r.wrong || 0),
      unattempted: Number(r.unattempted || 0),
      sections,
      best,
      weak
    };
  }, [result]);

  if (loading) {
    return <div className="container-centered py-8 text-secondary-700">Loading result...</div>;
  }

  return (
    <div className="container-centered py-8">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {/* Results Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-secondary-900 mb-2">
          Exam Complete
        </h1>
        <p className="text-lg text-secondary-600">
          Here’s how you performed
        </p>
      </div>

      {/* Score Card */}
      <div className="max-w-2xl mx-auto mb-8">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
          <CardBody className="py-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-primary-500 mb-4">
                <div className="text-3xl font-bold text-primary-700">
                  {normalized.score}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-secondary-900 mb-1">
              Your Score
            </h2>
            <p className="text-lg text-secondary-600 mb-6">
              {normalized.score} out of {normalized.totalMarks}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-secondary-600">Accuracy</div>
                <div className="text-2xl font-bold text-success-700">
                  {normalized.accuracyPct.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-600">Time Used</div>
                <div className="text-2xl font-bold text-primary-700">
                  {normalized.timeSpentMin}m
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-600">Rank</div>
                <div className="text-2xl font-bold text-warning-700">
                  #{normalized.rank || "-"}
                </div>
              </div>
            </div>

            <div className="text-sm text-secondary-600 grid grid-cols-3 gap-2">
              <span>Correct: <span className="font-bold text-success-700">{normalized.correct}</span></span>
              <span>Wrong: <span className="font-bold text-error-700">{normalized.wrong}</span></span>
              <span>Unattempted: <span className="font-bold text-secondary-900">{normalized.unattempted}</span></span>
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
          {normalized.sections.map((section) => {
            const percentage = Number(section.accuracy || 0);
            return (
              <Card key={section.sectionName}>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-secondary-900">
                      {section.sectionName}
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
                      {percentage.toFixed(2)}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-secondary-600">
                      {section.correct} correct out of {section.total}
                    </span>
                    <span className="text-secondary-500">
                      {section.correct}/{section.total}
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
            <div className="text-3xl mb-2">Best</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Strongest Section
            </h3>
            <p className="text-lg font-bold text-success-700">{normalized.best?.sectionName || "-"}</p>
            <p className="text-sm text-secondary-600">{Number(normalized.best?.accuracy || 0).toFixed(2)}% accuracy</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-3xl mb-2">Focus</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Improvement Area
            </h3>
            <p className="text-lg font-bold text-warning-700">{normalized.weak?.sectionName || "-"}</p>
            <p className="text-sm text-secondary-600">Focus more practice</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-3xl mb-2">Time</div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Time Efficiency
            </h3>
            <p className="text-lg font-bold text-primary-700">
              {((normalized.correct + normalized.wrong) / Math.max(1, normalized.timeSpentMin || 1)).toFixed(2)}
            </p>
            <p className="text-sm text-secondary-600">Attempted per minute</p>
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
          <Link to={location.state?.testId ? `/exam/${location.state.testId}` : "/select-test"}>
            <Button variant="primary" className="w-full">
              Retake Exam
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
