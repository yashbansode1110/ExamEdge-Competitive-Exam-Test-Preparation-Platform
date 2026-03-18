import React from "react";

/**
 * Card component for organizing content
 */
export function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

/**
 * Card header component
 */
export function CardHeader({ children, className = "" }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}

/**
 * Card body component
 */
export function CardBody({ children, className = "" }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

/**
 * Card footer component
 */
export function CardFooter({ children, className = "" }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}

export default Card;
