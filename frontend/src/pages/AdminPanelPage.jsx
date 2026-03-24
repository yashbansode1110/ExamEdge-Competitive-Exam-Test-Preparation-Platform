import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { StatCard } from "../components/dashboard/StatCard";

export function AdminPanelPage() {
  const { accessToken } = useSelector((s) => s.auth);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Alert variant="warning" title="Sign in required">
          Please log in to access the admin panel.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Admin Panel</h1>
        <p className="text-secondary-600 mt-1">
          Platform overview and quick actions.
        </p>
      </div>

      <div className="stats-grid mb-6">
        <StatCard title="Total Users" value={12834} unit="" change="+3%" changeType="positive" color="primary" icon="👥" />
        <StatCard title="Active Tests" value={214} unit="" change="+2" changeType="positive" color="success" icon="🧩" />
        <StatCard title="Avg Completion" value={71} unit="%" change="-1%" changeType="negative" color="warning" icon="✅" />
        <StatCard title="Reports" value={12} unit="" change="Needs review" changeType="neutral" color="error" icon="⚠️" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-bold text-secondary-900 mb-2">Manage Tests</h2>
            <p className="text-secondary-600 text-sm mb-4">Create, edit, and schedule JEE / MHT-CET tests.</p>
            <Button variant="primary" size="sm" className="w-full">
              Open Test Manager
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-bold text-secondary-900 mb-2">Moderate Content</h2>
            <p className="text-secondary-600 text-sm mb-4">Review question submissions and answer keys.</p>
            <Button variant="outline" size="sm" className="w-full">
              Review Queue
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-bold text-secondary-900 mb-2">Analytics Health</h2>
            <p className="text-secondary-600 text-sm mb-4">Check ingestion and monitoring alerts.</p>
            <Button variant="outline" size="sm" className="w-full">
              View Metrics
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 text-sm text-secondary-600">
        Tip: keep admin actions lightweight during exam windows.
      </div>
    </div>
  );
}

export default AdminPanelPage;

