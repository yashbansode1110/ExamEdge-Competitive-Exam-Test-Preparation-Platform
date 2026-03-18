import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { setSession } from "../store/authSlice.js";

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
      const data = await apiFetch("/auth/register", { method: "POST", body });
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
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-slate-400">Student and parent accounts are supported.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <label className="block text-sm">
          <span className="text-slate-300">Full name</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
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
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-300">Account type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </label>

        {role === "student" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-300">Target exam</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
              >
                <option value="JEE_MAIN">JEE Main</option>
                <option value="MHT_CET_PCM">MHT-CET PCM</option>
                <option value="MHT_CET_PCB">MHT-CET PCB</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Class</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-600"
                value={klass}
                onChange={(e) => setKlass(e.target.value)}
              >
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="dropper">Dropper</option>
              </select>
            </label>
          </div>
        ) : null}

        {error ? <div className="text-sm text-rose-400">{error}</div> : null}
        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create account"}
        </button>
        <div className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="text-indigo-400 hover:text-indigo-300" to="/login">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}

