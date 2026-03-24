import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { Card, CardBody } from "./ui/Card";

/**
 * Modern styled Login page
 */
export function LoginPageStyled() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      dispatch(setSession(data));
      nav("/");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-700 mb-2">ExamEdge</h1>
          <p className="text-secondary-600">Master your exam preparation</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardBody className="p-6">
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">Welcome Back</h2>
            <p className="text-secondary-600 mb-6">
              Access your tests, analytics, and recommendations.
            </p>

            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-900 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-900 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-secondary-700">Remember me</span>
                </label>
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={busy}
                isLoading={busy}
                className="w-full"
              >
                {busy ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-secondary-200">
              <p className="text-center text-secondary-600 text-sm">
                New here?{" "}
                <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                  Create an account
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-secondary-500">
          <p>© 2024 ExamEdge. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPageStyled;
