import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

export function Navbar() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-blue-600 transition-colors hover:text-blue-700"
        >
          ExamEdge
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-secondary-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              Login
            </Link>
          </motion.div>
          <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
            <Link
              to="/register"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Register
            </Link>
          </motion.div>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl p-2 text-secondary-700 hover:bg-blue-50 sm:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="border-t border-blue-100/80 bg-white/95 px-4 py-3 shadow-sm sm:hidden">
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="rounded-xl px-3 py-2 text-center text-sm font-medium text-secondary-700 hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-xl px-3 py-2 text-center text-sm font-medium text-secondary-700 hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              Register
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
