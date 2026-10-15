import type { ReactNode } from "react";

export function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-medium text-ink">
        {children}
      </div>
    </div>
  );
}
