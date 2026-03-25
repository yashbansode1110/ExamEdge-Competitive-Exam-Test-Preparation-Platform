import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { AdminQuestionsPage } from "./AdminQuestionsPage.jsx";
import { AdminTestsPage } from "./AdminTestsPage.jsx";

export function AdminPanelPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [tab, setTab] = useState("questions"); // questions | tests

  const isAdmin = String(user?.role || "").toLowerCase().includes("admin");

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Alert variant="warning" title="Sign in required">
          Please log in to access the admin panel.
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-centered py-12">
        <Alert variant="error" title="Admin access only">
          Your account does not have admin privileges.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Admin Panel</h1>
        <p className="text-secondary-600 mt-1">Create real-time tests and questions that students can attempt immediately.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={tab === "questions" ? "primary" : "outline"}
          onClick={() => setTab("questions")}
        >
          Questions
        </Button>
        <Button type="button" variant={tab === "tests" ? "primary" : "outline"} onClick={() => setTab("tests")}>
          Tests
        </Button>
      </div>

      <Card>
        <CardBody className="p-6">
          {tab === "questions" ? <AdminQuestionsPage /> : <AdminTestsPage />}
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminPanelPage;

