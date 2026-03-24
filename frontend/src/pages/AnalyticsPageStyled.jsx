import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { StatCard } from "../components/dashboard/StatCard";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";

/**
 * Analytics Dashboard - Performance metrics and charts
 */
export function AnalyticsPageStyled() {
  const { accessToken } = useSelector((s) => s.auth);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch("/analytics", { token: accessToken });
        if (!cancelled) {
          setAnalytics(data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Mock data for demonstration
  const mockAnalytics = {
    totalTests: 25,
    averageScore: 78,
    bestScore: 92,
    worstScore: 58,
    consistencyScore: 85,
    overallAccuracy: 76,
    topicAccuracy: [
      { name: "Quadratic Equations", accuracy: 92, attempts: 5 },
      { name: "Dynamics", accuracy: 88, attempts: 7 },
      { name: "Organic Reactions", accuracy: 85, attempts: 6 },
      { name: "Probability", accuracy: 72, attempts: 8 },
      { name: "Inorganic Properties", accuracy: 68, attempts: 4 },
    ],
    weakTopics: [
      { name: "Trigonometry", accuracy: 55, attempts: 3 },
      { name: "Electrostatics", accuracy: 62, attempts: 4 },
      { name: "Thermodynamics", accuracy: 65, attempts: 5 },
    ],
    examWiseTrend: [65, 70, 68, 75, 78, 82, 79, 85, 88],
    scoreDistribution: {
      "80-100": 8,
      "60-80": 12,
      "40-60": 5,
      "0-40": 0,
    },
    timeAnalysis: {
      averageTimePerQuestion: 2.5,
      fastestSections: ["Physics", "Chemistry"],
      slowestSections: ["Mathematics"],
    },
  };

  const data = analytics || mockAnalytics;

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Alert variant="warning" title="Sign in required">
          Please sign in to view your analytics.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-secondary-900 mb-2">Analytics Dashboard</h1>
        <p className="text-lg text-secondary-600">
          Track your progress and identify improvement areas
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          {error}
        </Alert>
      )}

      {/* Key Statistics */}
      <div className="stats-grid mb-8">
        <StatCard
          title="Average Score"
          value={data.averageScore}
          unit="%"
          change="+5% this month"
          changeType="positive"
          color="primary"
          icon="📊"
        />
        <StatCard
          title="Best Score"
          value={data.bestScore}
          unit="%"
          color="success"
          icon="🏆"
        />
        <StatCard
          title="Total Tests"
          value={data.totalTests}
          color="primary"
          icon="📝"
        />
        <StatCard
          title="Overall Accuracy"
          value={data.overallAccuracy}
          unit="%"
          color="success"
          icon="✓"
        />
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Score Trend */}
        <Card>
          <CardHeader className="font-semibold text-secondary-900">
            Score Trend
          </CardHeader>
          <CardBody>
            <div className="h-48 flex items-end justify-between gap-1">
              {data.examWiseTrend.map((score, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-primary-400 to-primary-600 rounded-t-lg transition-all duration-300 hover:from-primary-500 hover:to-primary-700"
                  style={{
                    height: `${(score / 100) * 100}%`,
                    minHeight: "2px",
                  }}
                  title={`Test ${index + 1}: ${score}%`}
                />
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-secondary-600">
                Trend: <span className="font-bold text-success-600">↑ Improving</span>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader className="font-semibold text-secondary-900">
            Score Distribution
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Object.entries(data.scoreDistribution).map(([range, count]) => (
                <div key={range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-700">
                      {range}
                    </span>
                    <span className="text-sm font-bold text-secondary-900">
                      {count} tests
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        parseInt(range) >= 80
                          ? "bg-success-500"
                          : parseInt(range) >= 60
                            ? "bg-warning-500"
                            : "bg-error-500"
                      }`}
                      style={{ width: `${(count / data.totalTests) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Strong Topics */}
        <Card>
          <CardHeader className="font-semibold text-secondary-900">
            💪 Strong Topics
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {data.topicAccuracy.slice(0, 3).map((topic, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-900">
                      {topic.name}
                    </span>
                    <Badge variant="success">{topic.accuracy}%</Badge>
                  </div>
                  <div className="text-xs text-secondary-500">
                    {topic.attempts} attempts
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Weak Topics */}
        <Card>
          <CardHeader className="font-semibold text-secondary-900">
            📈 Areas to Improve
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {data.weakTopics.map((topic, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-900">
                      {topic.name}
                    </span>
                    <Badge variant="warning">{topic.accuracy}%</Badge>
                  </div>
                  <div className="text-xs text-secondary-500">
                    {topic.attempts} attempts
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Topic Accuracy Heatmap */}
      <Card className="mb-8">
        <CardHeader className="font-semibold text-secondary-900">
          🔥 Topic Accuracy Heatmap
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {data.topicAccuracy.map((topic, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-secondary-900">
                    {topic.name}
                  </span>
                  <span className="text-sm font-bold text-secondary-700">
                    {topic.accuracy}%
                  </span>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      topic.accuracy >= 85
                        ? "bg-success-500"
                        : topic.accuracy >= 70
                          ? "bg-warning-500"
                          : "bg-error-500"
                    }`}
                    style={{ width: `${topic.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Time Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-primary-700 mb-1">
              {data.timeAnalysis.averageTimePerQuestion}
            </div>
            <p className="text-sm text-secondary-600">Avg. time per question</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-lg font-semibold text-success-700 mb-2">
              ✓ Fastest
            </div>
            <div className="space-y-1">
              {data.timeAnalysis.fastestSections.map((section) => (
                <p key={section} className="text-sm text-secondary-600">
                  {section}
                </p>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <div className="text-lg font-semibold text-warning-700 mb-2">
              ⏱️ Slowest
            </div>
            <div className="space-y-1">
              {data.timeAnalysis.slowestSections.map((section) => (
                <p key={section} className="text-sm text-secondary-600">
                  {section}
                </p>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPageStyled;
