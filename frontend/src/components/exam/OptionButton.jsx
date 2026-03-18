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
  className = "",
}) {
  return (
    <label className={`option-wrapper ${selected ? "selected" : ""} ${className}`}>
      <input
        type="radio"
        name="exam-option"
        value={value}
        checked={selected}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="option-input"
      />
      <span className="option-label">{label}</span>
    </label>
  );
}

export default OptionButton;
