import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-muted"><LoaderCircle className="animate-spin text-teal-600" size={19} />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} />Something went wrong</div><p className="mt-2">{message}</p>{retry && <button className="mt-3 inline-flex items-center gap-2 font-semibold" onClick={retry}><RefreshCw size={14} />Try again</button>}</div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center"><p className="font-semibold text-ink">{title}</p><p className="mt-2 text-sm text-muted">{message}</p></div>;
}
