import React, { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { clearSession, setSession } from "../store/authSlice.js";
import { Navbar } from "./ui/Navbar.jsx";

export function RootLayout() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
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

  const isMinimalRoute =
    location.pathname.startsWith("/exam/") || location.pathname === "/login" || location.pathname === "/register";

  if (isMinimalRoute) {
    return <Outlet />;
  }

  const links = [
    { href: "/analytics", label: "Analytics", active: location.pathname.startsWith("/analytics") },
  ];

  if (user) {
    links.push({
      href: "/profile",
      label: "Profile",
      active: location.pathname.startsWith("/profile"),
    });

    links.push({
      href: "/select-test",
      label: "Select Test",
      active: location.pathname.startsWith("/select-test"),
    });

    if (String(user.role || "").toLowerCase().includes("parent")) {
      links.push({
        href: "/parent-dashboard",
        label: "Parent Dashboard",
        active: location.pathname.startsWith("/parent-dashboard"),
      });
    }

    if (String(user.role || "").toLowerCase().includes("admin")) {
      links.push({
        href: "/admin",
        label: "Admin",
        active: location.pathname.startsWith("/admin"),
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Navbar
        logo="ExamEdge"
        user={user}
        onLogout={() => {
          dispatch(clearSession());
          nav("/login");
        }}
        links={links}
      />

      <main className="container-centered py-6">
        <Outlet />
      </main>

      <footer className="container-centered py-10 text-xs text-secondary-600">
        ExamEdge — JEE Main + MHT-CET (PCM/PCB).
      </footer>
    </div>
  );
}

