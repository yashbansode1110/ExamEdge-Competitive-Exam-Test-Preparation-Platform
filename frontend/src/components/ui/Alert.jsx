import React from "react";

/**
 * Alert component for messages and notifications
 * @param {string} variant - 'info' | 'success' | 'warning' | 'error'
 * @param {ReactNode} children - Alert content
 * @param {boolean} dismissible - Show close button
 * @param {function} onDismiss - Callback when dismissed
 */
export function Alert({
  variant = "info",
  children,
  dismissible = false,
  onDismiss,
  className = "",
  title,
}) {
  const [visible, setVisible] = React.useState(true);

  const variantClasses = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error",
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className={`alert ${variantClasses[variant] || variantClasses.info} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div>{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="mt-1 text-inherit opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default Alert;
