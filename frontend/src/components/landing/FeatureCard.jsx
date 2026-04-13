import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function FeatureCard({ icon, title, description, variants }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      variants={variants}
      className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-xl"
      whileHover={
        reduceMotion
          ? undefined
          : {
              scale: 1.03,
              y: -4,
            }
      }
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-secondary-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-secondary-600">{description}</p>
    </motion.article>
  );
}

export default FeatureCard;
