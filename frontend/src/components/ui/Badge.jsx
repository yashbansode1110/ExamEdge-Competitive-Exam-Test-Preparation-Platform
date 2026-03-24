import React from "react";

/**
 * Badge component for tags and labels
 * @param {string} variant - 'primary' | 'success' | 'warning' | 'error' | 'neutral'
 * @param {ReactNode} children - Badge content
 * @param {string} className - Additional Tailwind classes
 */
export function Badge({
  variant = "primary",
  children,
  className = "",
  isDot = false,
}) {
  const variantClasses = {
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    neutral: "badge-neutral",
  };

  if (isDot) {
    return <div className={`status-dot bg-${variant}-500`} />;
  }

  return (
    <span className={`badge ${variantClasses[variant] || variantClasses.primary} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
