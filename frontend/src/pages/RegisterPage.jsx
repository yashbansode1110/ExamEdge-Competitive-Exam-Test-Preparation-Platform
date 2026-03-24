import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";

export function RegisterPage() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [targetExam, setTargetExam] = useState("JEE_MAIN");
  const [klass, setKlass] = useState("12");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body =
        role === "student"
          ? { name, email, password, role, targetExam, class: klass }
          : { name, email, password, role };
      await apiFetch("/auth/register", { method: "POST", body });
      // Do not auto-login after registration; require manual login for security semantics.
      nav("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardBody className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary-700 mb-2">Create account</h1>
            <p className="text-secondary-600">Student and parent accounts are supported.</p>
          </div>

          {error ? (
            <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-4">
              {error}
            </Alert>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-secondary-900">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full mt-1" />
            </label>

            <label className="block text-sm font-medium text-secondary-900">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
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
                minLength={8}
                required
                className="w-full mt-1"
              />
            </label>

            <label className="block text-sm font-medium text-secondary-900">
              Account type
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1">
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </select>
            </label>

            {role === "student" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-secondary-900">
                  Target exam
                  <select value={targetExam} onChange={(e) => setTargetExam(e.target.value)} className="w-full mt-1">
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="MHT_CET_PCM">MHT-CET PCM</option>
                    <option value="MHT_CET_PCB">MHT-CET PCB</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-secondary-900">
                  Class
                  <select value={klass} onChange={(e) => setKlass(e.target.value)} className="w-full mt-1">
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="dropper">Dropper</option>
                  </select>
                </label>
              </div>
            ) : null}

            <Button type="submit" variant="primary" disabled={busy} isLoading={busy} className="w-full">
              {busy ? "Creating..." : "Create account"}
            </Button>

            <div className="text-center text-sm text-secondary-600 pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                Login
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

