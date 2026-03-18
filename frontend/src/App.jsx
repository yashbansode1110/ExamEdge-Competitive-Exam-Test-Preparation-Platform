import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./components/RootLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { ExamInterfacePage } from "./pages/ExamInterfacePage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "exam/:testId", element: <ExamInterfacePage /> }
    ]
  }
]);

