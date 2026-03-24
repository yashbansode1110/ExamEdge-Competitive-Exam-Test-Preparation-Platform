import React, { useEffect } from "react";
import { Button } from "./Button";

/**
 * Modal component for dialogs
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Called when modal should close
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {function} onSubmit - Callback for submit button
 * @param {string} submitLabel - Submit button text
 */
export function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Submit",
  closeLabel = "Cancel",
  size = "md",
  className = "",
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            className="modal-close text-lg font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onSubmit && (
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              {closeLabel}
            </Button>
            <Button variant="primary" onClick={onSubmit}>
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
