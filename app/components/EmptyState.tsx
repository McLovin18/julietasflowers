import React from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <span
        className="material-icons-round text-6xl opacity-30"
        style={{ color: "var(--textSecondary)" }}
      >
        {icon}
      </span>
      <h3
        className="text-xl font-semibold mt-4 font-lovely-flowers"
        style={{ 
          color: "var(--text)",
          fontSize: "1.5rem",
          lineHeight: "1.4"
        }}
      >
        {title}
      </h3>
      {message && (
        <p
          className="text-sm mt-2"
          style={{ color: "var(--textSecondary)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
