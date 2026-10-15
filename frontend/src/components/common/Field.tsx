import type { ReactNode } from "react";

export function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium text-ink ${className}`}>
      {label}
      <div className="mt-2">{children}</div>
      {error && (
        <span className="mt-1 block text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}
