import React, { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { clearSession, setSession } from "../store/authSlice.js";

export function RootLayout() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((s) => s.auth);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      if (!accessToken) return;
      try {
        const data = await apiFetch("/auth/me", { token: accessToken });
        if (!cancelled) dispatch(setSession({ user: data.user }));
      } catch {
        if (!cancelled) dispatch(clearSession());
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            ExamEdge
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/analytics" className="text-slate-300 hover:text-white">
              Analytics
            </Link>
            {user ? (
              <>
                <span className="text-slate-400">
                  {user.name} ({user.role})
                </span>
                <button
                  className="rounded-md bg-slate-800 px-3 py-1.5 hover:bg-slate-700"
                  onClick={() => {
                    dispatch(clearSession());
                    nav("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="rounded-md bg-slate-800 px-3 py-1.5 hover:bg-slate-700" to="/login">
                  Login
                </Link>
                <Link className="rounded-md bg-indigo-600 px-3 py-1.5 hover:bg-indigo-500" to="/register">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-500">
        ExamEdge — JEE Main + MHT-CET (PCM/PCB). NEET not included.
      </footer>
    </div>
  );
}

