import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";

/**
 * Navigation bar component
 */
export function Navbar({ logo = "ExamEdge", user, onLogout, links = [] }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          {logo}
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav hidden md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`navbar-link ${link.active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User Section */}
        <div className="navbar-user">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-semibold text-secondary-900">{user.name}</div>
                  <div className="text-secondary-500 text-xs">{user.role}</div>
                </div>
                <div className="navbar-avatar">{user.name?.[0]?.toUpperCase()}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="ml-2"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="ml-2">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="ml-4 md:hidden text-secondary-700 hover:text-secondary-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-secondary-200 bg-[#FAFBFC] px-4 py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block py-2 text-sm text-secondary-700 hover:text-primary-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
