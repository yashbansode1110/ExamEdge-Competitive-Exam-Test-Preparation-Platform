import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

const contentVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -right-16 top-40 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-primary-300/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={contentVariants}
          className="max-w-3xl"
        >
          <p className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 shadow-sm backdrop-blur-sm sm:text-sm">
            JEE Main · MHT-CET
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-secondary-900 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-tight">
            Master JEE &amp; MHT-CET with Real Exam Practice
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-secondary-600 sm:text-lg">
            Practice with real exam interface, track performance, and improve with AI-powered insights.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-blue-700 sm:w-auto"
              >
                Start Practicing
              </Link>
            </motion.div>
            <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-blue-200 bg-white/90 px-6 py-3 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/90 sm:w-auto"
              >
                Learn More
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
