import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";

const DEMO_STUDENT = {
  email: "demo.student@examedge.local",
  password: "DemoPassword123!"
};

const DEMO_ADMIN = {
  email: "demo.admin@examedge.local",
  password: "DemoPassword123!"
};

export function LoginPage() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginWithCredentials(creds) {
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: creds });
      dispatch(setSession(data));
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    await loginWithCredentials({ email, password });
  }

  async function onDemoStudent() {
    setEmail(DEMO_STUDENT.email);
    setPassword(DEMO_STUDENT.password);
    await loginWithCredentials(DEMO_STUDENT);
  }

  async function onDemoAdmin() {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
    await loginWithCredentials(DEMO_ADMIN);
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardBody className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary-700 mb-2">ExamEdge</h1>
            <p className="text-secondary-600">Sign in to start tests and view analytics.</p>
          </div>

          {error ? (
            <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-4">
              {error}
            </Alert>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-secondary-900">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                required
                className="w-full mt-1"
              />
            </label>

            <label className="block text-sm font-medium text-secondary-900">
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className="w-full mt-1"
              />
            </label>

            <Button type="submit" variant="primary" disabled={busy} isLoading={busy} className="w-full">
              {busy ? "Signing in..." : "Sign in"}
            </Button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={onDemoStudent}>
                Student demo
              </Button>
              <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={onDemoAdmin}>
                Admin demo
              </Button>
            </div>
            <p className="text-center text-xs text-secondary-500">
              One-tap sign-in uses seeded accounts. Run{" "}
              <code className="rounded bg-secondary-100 px-1 py-0.5 text-secondary-800">npm run seed:demo</code> in{" "}
              <code className="rounded bg-secondary-100 px-1 py-0.5 text-secondary-800">backend</code> if login fails.
            </p>

            <div className="text-center text-sm text-secondary-600 pt-2">
              New here?{" "}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                Create an account
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

