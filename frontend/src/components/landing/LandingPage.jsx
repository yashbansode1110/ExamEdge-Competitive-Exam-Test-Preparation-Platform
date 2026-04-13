import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "./Navbar.jsx";
import { HeroSection } from "./HeroSection.jsx";
import { FeatureCard } from "./FeatureCard.jsx";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const features = [
  {
    title: "Real Exam Simulation",
    description: "Timed tests with official-style layouts so exam day feels familiar and focused.",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "AI Performance Analytics",
    description: "Visualize accuracy, speed, and trends to see exactly where you are improving.",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "Weak Topic Detection",
    description: "Spot recurring mistakes and prioritize chapters that move your score the most.",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    title: "Secure Test Environment",
    description: "A controlled, integrity-focused flow designed for serious exam-style practice.",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
];

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-white text-secondary-900">
      <Navbar />
      <HeroSection />

      <section id="features" className="scroll-mt-20 border-t border-blue-100/60 bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-secondary-900 sm:text-3xl">
              Everything you need to prepare like it&apos;s exam day
            </h2>
            <p className="mt-3 text-secondary-600 sm:text-lg">
              Built for students who want structure, realism, and data-backed revision.
            </p>
          </div>

          <motion.div
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={containerVariants}
          >
            {features.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} variants={itemVariants} />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t border-blue-100/60 bg-gradient-to-br from-blue-50 via-white to-blue-50/80 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid gap-12 rounded-2xl border border-blue-100/80 bg-white/90 p-10 shadow-md sm:grid-cols-3 sm:gap-8 sm:p-12 lg:p-14"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-center sm:text-left">
              <p className="text-3xl font-extrabold leading-tight tracking-tight text-blue-600 sm:text-4xl lg:text-5xl">
                10,000+ Questions
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-3xl font-extrabold leading-tight tracking-tight text-secondary-900 sm:text-4xl lg:text-5xl">
                JEE &amp; CET Patterns
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-3xl font-extrabold leading-tight tracking-tight text-secondary-900 sm:text-4xl lg:text-5xl">
                Real Exam UI
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-secondary-200 bg-secondary-50/80 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-secondary-600 sm:flex-row sm:text-left sm:px-6 lg:px-8">
          <p className="font-medium text-secondary-700">ExamEdge — JEE Main + MHT-CET (PCM/PCB).</p>
          <p>© {new Date().getFullYear()} ExamEdge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
