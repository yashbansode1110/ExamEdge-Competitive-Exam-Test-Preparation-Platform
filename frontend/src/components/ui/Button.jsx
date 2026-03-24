import React from "react";

/**
 * Versatile Button component with multiple variants
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} isLoading - Shows loading state
 * @param {ReactNode} children - Button content
 * @param {string} className - Additional Tailwind classes
 * @param {...props} props - Standard button props
 */
export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  children,
  className = "",
  type = "button",
  ...props
}) {
  const baseClasses = "btn";

  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    danger: "btn-danger",
    success: "btn-success",
  };

  const sizeClasses = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  };

  const classes = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${
    sizeClasses[size] || ""
  } ${disabled || isLoading ? "opacity-60 cursor-not-allowed" : ""} ${className}`;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={classes}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
