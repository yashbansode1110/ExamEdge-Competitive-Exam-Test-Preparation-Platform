import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Card, CardBody } from "../components/ui/Card";

/**
 * Modern styled Register page
 */
export function RegisterPageStyled() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
      });
      dispatch(setSession(data));
      nav("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
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
          <p className="text-secondary-600">Start your journey today</p>
        </div>

        {/* Register Card */}
        <Card>
          <CardBody className="p-6">
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">Create Account</h2>
            <p className="text-secondary-600 mb-6">
              Join thousands of students mastering their exams.
            </p>

            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-900 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-900 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-secondary-900 mb-2">
                  I am a
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full"
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-900 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-900 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>

              <div className="flex items-start gap-2">
                <input id="terms" type="checkbox" required className="mt-1" />
                <label htmlFor="terms" className="text-sm text-secondary-700">
                  I agree to the{" "}
                  <a href="#" className="text-primary-600 hover:text-primary-700">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={busy}
                isLoading={busy}
                className="w-full"
              >
                {busy ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-secondary-200">
              <p className="text-center text-secondary-600 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPageStyled;
