export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = { Open: "bg-sky-50 text-sky-700", "In Progress": "bg-amber-50 text-amber-700", Resolved: "bg-emerald-50 text-emerald-700", Closed: "bg-slate-100 text-slate-600", Urgent: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-indigo-50 text-indigo-700", Low: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}
