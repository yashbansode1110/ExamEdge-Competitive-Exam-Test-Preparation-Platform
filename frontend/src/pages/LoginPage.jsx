import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";

export function LoginPage() {
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
      const data = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
      dispatch(setSession(data));
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-slate-400">Access your tests, analytics, and recommendations.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <label className="block text-sm">
          <span className="text-slate-300">Email</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-300">Password</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error ? <div className="text-sm text-rose-400">{error}</div> : null}
        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-center text-sm text-slate-400">
          New here?{" "}
          <Link className="text-indigo-400 hover:text-indigo-300" to="/register">
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}

