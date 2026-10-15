import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = "Please wait…",
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">
                {title}
              </h2>
              <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-muted">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close confirmation dialog"
            disabled={pending}
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 disabled:opacity-50"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            className="btn-secondary w-full disabled:opacity-50 sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
