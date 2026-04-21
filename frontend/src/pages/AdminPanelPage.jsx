import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Alert } from "../components/ui/Alert";
import { AdminQuestionsPage } from "./AdminQuestionsPage.jsx";
import { AdminTestsPage } from "./AdminTestsPage.jsx";
import { AdminCheatingLogs } from "./AdminCheatingLogs.jsx";
import { Sidebar } from "../components/admin/Sidebar.jsx";
import { Topbar } from "../components/admin/Topbar.jsx";

export function AdminPanelPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [tab, setTab] = useState("dashboard"); // dashboard | questions | tests | cheating

  const isAdmin = String(user?.role || "").toLowerCase().includes("admin");

  if (!accessToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-50">
        <Alert variant="warning" title="Sign in required">
          Please log in to access the admin panel.
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-50">
        <Alert variant="error" title="Admin access only">
          Your account does not have admin privileges.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-secondary-50 font-sans overflow-hidden">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {tab === "dashboard" ? (
             <div className="max-w-4xl space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-secondary-100">
                  <h2 className="text-3xl font-bold text-secondary-900 mb-2">Welcome Back, {user?.name || "Admin"}!</h2>
                  <p className="text-secondary-600 text-lg">Select an option from the sidebar to manage exams, questions, or monitor cheating logs.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-secondary-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("questions")}>
                     <h3 className="text-lg font-bold text-secondary-900">Manage Questions</h3>
                     <p className="text-sm text-secondary-600 mt-2">Add or bulk upload questions.</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-secondary-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("tests")}>
                     <h3 className="text-lg font-bold text-secondary-900">Manage Tests</h3>
                     <p className="text-sm text-secondary-600 mt-2">Create and configure tests.</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-secondary-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("cheating")}>
                     <h3 className="text-lg font-bold text-secondary-900">Cheating Logs</h3>
                     <p className="text-sm text-secondary-600 mt-2">Monitor proctoring alerts.</p>
                  </div>
                </div>
             </div>
          ) : null}
          {tab === "questions" ? <AdminQuestionsPage /> : null}
          {tab === "tests" ? <AdminTestsPage /> : null}
          {tab === "cheating" ? <AdminCheatingLogs /> : null}
        </main>
      </div>
    </div>
  );
}

export default AdminPanelPage;

