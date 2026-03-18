import React from "react";
import { Link } from "react-router-dom";

/**
 * Sidebar component for navigation
 */
export function Sidebar({ items = [], isOpen = true, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 md:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative md:block w-64 h-screen bg-white border-r border-secondary-200 overflow-y-auto transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="p-4 space-y-2">
          {items.map((item, index) => (
            <div key={index}>
              {item.section && (
                <div className="px-3 py-2 mt-4 mb-2 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  {item.section}
                </div>
              )}
              {item.href ? (
                <Link
                  to={item.href}
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    item.active
                      ? "bg-primary-100 text-primary-700 font-semibold"
                      : "text-secondary-700 hover:bg-secondary-50"
                  }`}
                  onClick={() => onClose?.()}
                >
                  <span className="flex items-center gap-3">
                    {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                    <span>{item.label}</span>
                  </span>
                </Link>
              ) : (
                <div className="px-3 py-2 text-sm font-medium text-secondary-900">
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
