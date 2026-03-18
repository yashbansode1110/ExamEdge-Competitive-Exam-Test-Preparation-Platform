import React from "react";
import { Card, CardBody } from "../ui/Card";

/**
 * Statistics card component for dashboard
 */
export function StatCard({
  title,
  value,
  unit,
  change,
  changeType = "positive", // positive | negative | neutral
  icon,
  trend,
  color = "primary", // primary | success | warning | error
}) {
  const colorClasses = {
    primary: "text-primary-600",
    success: "text-success-600",
    warning: "text-warning-600",
    error: "text-error-600",
  };

  const changeColors = {
    positive: "text-success-600",
    negative: "text-error-600",
    neutral: "text-secondary-600",
  };

  return (
    <Card className="hover-card">
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm text-secondary-600 font-medium">{title}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-3xl font-bold ${colorClasses[color]}`}>
                {value}
              </span>
              {unit && <span className="text-sm text-secondary-500">{unit}</span>}
            </div>
          </div>
          {icon && (
            <div className={`text-3xl ${colorClasses[color]} opacity-20`}>
              {icon}
            </div>
          )}
        </div>

        {change && (
          <div className={`text-sm font-medium flex items-center gap-1 ${changeColors[changeType]}`}>
            <span>
              {changeType === "positive" && "↑"}
              {changeType === "negative" && "↓"}
            </span>
            <span>{change}</span>
          </div>
        )}

        {trend && (
          <div className="mt-3 h-8 bg-secondary-100 rounded flex items-end gap-1 p-1">
            {trend.map((value, index) => (
              <div
                key={index}
                className={`flex-1 rounded-sm ${colorClasses[color]} bg-current`}
                style={{ height: `${(value / 100) * 100}%`, opacity: 0.7 }}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default StatCard;
