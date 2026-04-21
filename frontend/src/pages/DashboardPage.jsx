import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { TestCard } from "../components/dashboard/TestCard";
import { PaymentButton } from "../components/ui/PaymentButton";
import { LandingPage } from "../components/landing/LandingPage.jsx";

function normalizeExam(examValue) {
  const v = String(examValue || "").toUpperCase();
  if (v.includes("JEE")) return "JEE Main";
  if (v.includes("MHT")) return "MHT-CET";
  return "Other";
}

export function DashboardPage() {
  const nav = useNavigate();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");
  const [successPaymentMessage, setSuccessPaymentMessage] = useState("");

  const isPremium = user?.isPremium;
  const testsAttempted = user?.testsAttempted || 0;
  const testsRemaining = Math.max(0, 2 - testsAttempted);
  const isLockedOut = !isPremium && testsAttempted >= 2;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      try {
        const data = await apiFetch("/tests", { token: accessToken });
        if (!cancelled) setTests(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const welcomeName = useMemo(() => (user?.name ? user.name.split(" ")[0] : ""), [user?.name]);

  if (!accessToken) {
    return <LandingPage />;
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">
          Student Dashboard{welcomeName ? `, ${welcomeName}` : ""}
        </h1>
        <p className="text-secondary-600 mt-1">Start an exam-style test. Keep it focused and exam-friendly.</p>
      </div>

      {error ? (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          {error}
        </Alert>
      ) : null}

      {successPaymentMessage ? (
        <Alert variant="success" dismissible onDismiss={() => setSuccessPaymentMessage("")} className="mb-6 bg-green-50 text-green-800 border-green-200">
          <strong className="font-bold">Success!</strong> {successPaymentMessage}
        </Alert>
      ) : null}

      {!isPremium && (
        <div className={`mb-6 p-4 rounded-xl border ${isLockedOut ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className={`text-lg font-bold ${isLockedOut ? 'text-red-800' : 'text-blue-800'}`}>
                {isLockedOut ? "Free Limit Reached" : "Free Tier"}
              </h3>
              <p className={`text-sm mt-1 ${isLockedOut ? 'text-red-700' : 'text-blue-700'}`}>
                {isLockedOut 
                  ? "You have used all 2 of your free mock tests. Upgrade to Premium to access all tests permanently." 
                  : `You have ${testsRemaining} free test${testsRemaining === 1 ? '' : 's'} remaining before requiring a Premium upgrade.`}
              </p>
            </div>
            {isLockedOut && (
              <PaymentButton onPaymentSuccess={() => {
                setSuccessPaymentMessage("Your account has been upgraded to Premium! You now have permanent access to all tests.");
              }} />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link to="/select-test">
          <Button variant="primary">Choose Test</Button>
        </Link>
        <Link to="/analytics">
          <Button variant="outline">View Analytics</Button>
        </Link>
      </div>

      {tests.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((t) => (
            <TestCard
              key={t._id}
              testId={t._id}
              title={t.name || "Untitled Test"}
              examType={normalizeExam(t.exam)}
              duration={Math.round(Number(t.durationMs || 0) / 60000)}
              totalQuestions={t.totalQuestions || 0}
              difficulty={t.difficulty || "Easy"}
              description={t.description || ""}
              status={t.status || "available"}
              onClick={() => {
                if (isLockedOut) {
                  setError("Please upgrade to Premium to start this test.");
                  return;
                }
                nav(`/instructions/${t._id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-secondary-600">No tests available yet.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

