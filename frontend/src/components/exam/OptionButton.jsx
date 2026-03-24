import React from "react";

/**
 * Option Button component for exam options
 */
export function OptionButton({
  id,
  label,
  value,
  selected = false,
  disabled = false,
  onChange,
  name = "exam-option",
  className = "",
  variant = "jee", // 'jee' | 'mhtcet'
}) {
  const wrapperBaseClass = variant === "mhtcet" ? "mhtcet-option" : "option-wrapper";
  const inputClass = variant === "mhtcet" ? "mhtcet-option-radio" : "option-input";
  const labelClass = variant === "mhtcet" ? "mhtcet-option-text" : "option-label";

  return (
    <label
      className={`exam-option ${wrapperBaseClass} ${selected ? "selected" : ""} ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      aria-disabled={disabled ? "true" : "false"}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={inputClass}
      />
      <span className={labelClass}>{label}</span>
    </label>
  );
}

export default OptionButton;
