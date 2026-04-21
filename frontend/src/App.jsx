import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./components/RootLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { InstructionsPage } from "./pages/InstructionsPage.jsx";
import { ExamInterfacePageUI } from "./pages/ExamInterfacePageUI.jsx";
import { ResultsPage } from "./pages/ResultsPage.jsx";
import { TestSelectionPage } from "./pages/TestSelectionPage.jsx";
import { ParentDashboardPage } from "./pages/ParentDashboardPage.jsx";
import { AdminPanelPage } from "./pages/AdminPanelPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "instructions/:testId", element: <InstructionsPage /> },
      { path: "exam/:testId", element: <ExamInterfacePageUI /> },
      { path: "result/:attemptId", element: <ResultsPage /> },
      { path: "exam/results", element: <ResultsPage /> },
      { path: "select-test", element: <TestSelectionPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "parent-dashboard", element: <ParentDashboardPage /> },
      { path: "admin", element: <AdminPanelPage /> },
      { path: "*", element: <Navigate to="/" /> }
    ]
  }
]);

