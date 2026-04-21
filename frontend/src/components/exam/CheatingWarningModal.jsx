import React from "react";
import { Modal } from "../ui/Modal.jsx";

export function CheatingWarningModal({ isOpen, eventType, onConfirm }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => {}}>
      <div className="p-6 max-w-sm mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cheating Detected!</h2>
        <p className="text-gray-600 mb-6">
          System recorded violation: <span className="font-semibold text-red-600">{eventType}</span>.<br />
          Your activities are being logged. Repeated offenses will result in nullification of the exam.
        </p>
        <button
          onClick={onConfirm}
          className="w-full bg-red-600 text-white font-medium py-2 px-4 rounded hover:bg-red-700 transition"
        >
          OK, I Understand
        </button>
      </div>
    </Modal>
  );
}
