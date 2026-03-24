import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { StatCard } from "../components/dashboard/StatCard";

export function ParentDashboardPage() {
  const { accessToken, user } = useSelector((s) => s.auth);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="py-12 text-center">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">Parent Dashboard</h1>
            <p className="text-secondary-600 mb-6">Please log in to view progress.</p>
            <Link to="/login">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Parent Dashboard</h1>
        <p className="text-secondary-600 mt-1">{user?.name ? `Hi ${user.name.split(" ")[0]}. ` : ""}Track student progress at a glance.</p>
      </div>

      <div className="stats-grid mb-6">
        <StatCard title="Average Score" value={82} unit="%" change="+4" changeType="positive" color="primary" icon="📈" />
        <StatCard title="Accuracy" value={76} unit="%" change="+2" changeType="positive" color="success" icon="✓" />
        <StatCard title="Tests Completed" value={14} change="+3" changeType="positive" color="primary" icon="📝" />
        <StatCard title="Study Streak" value={9} unit="days" change="Keep going" changeType="neutral" color="warning" icon="🔥" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-2">Areas to Improve</h2>
            <p className="text-secondary-600 text-sm mb-4">Based on recent attempts.</p>
            <div className="space-y-3">
              {[
                { label: "Trigonometry", v: 55 },
                { label: "Electrostatics", v: 62 },
                { label: "Thermodynamics", v: 65 },
              ].map((t) => (
                <div key={t.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-secondary-900">{t.label}</span>
                    <span className="text-secondary-700">{t.v}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary-200">
                    <div className={`h-2 rounded-full ${t.v < 60 ? "bg-error-500" : t.v < 70 ? "bg-warning-500" : "bg-success-500"}`} style={{ width: `${t.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-2">Next Steps</h2>
            <p className="text-secondary-600 text-sm mb-4">Lightweight actions to keep momentum.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                <div>
                  <div className="font-semibold text-secondary-900 text-sm">Suggested practice</div>
                  <div className="text-secondary-600 text-xs">20 MCQs on weakest topics</div>
                </div>
                <Button variant="outline" size="sm">Start</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                <div>
                  <div className="font-semibold text-secondary-900 text-sm">Timed revision</div>
                  <div className="text-secondary-600 text-xs">10-min daily review</div>
                </div>
                <Button variant="outline" size="sm">Schedule</Button>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/select-test">
                <Button variant="primary" className="w-full">Pick a test for the student</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default ParentDashboardPage;

