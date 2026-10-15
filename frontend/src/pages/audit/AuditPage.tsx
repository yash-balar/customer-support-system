import {
  Activity,
  ArrowRight,
  Check,
  CirclePlus,
  FilePenLine,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { useAuditEntries } from "../../api/audit/hook";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import type { AuditEntry } from "../../types";

function actionPresentation(action: string, targetType: string) {
  const target = targetType.toLowerCase();
  const actions: Record<
    string,
    { label: string; icon: typeof Activity; color: string }
  > = {
    created: {
      label: `Created ${target}`,
      icon: CirclePlus,
      color: "bg-emerald-50 text-emerald-700",
    },
    updated: {
      label: `Updated ${target}`,
      icon: FilePenLine,
      color: "bg-sky-50 text-sky-700",
    },
    reassigned: {
      label: `Reassigned ${target}`,
      icon: RefreshCw,
      color: "bg-violet-50 text-violet-700",
    },
    deleted: {
      label: `Deleted ${target}`,
      icon: Trash2,
      color: "bg-rose-50 text-rose-700",
    },
    invited: {
      label: "Invited a team member",
      icon: CirclePlus,
      color: "bg-emerald-50 text-emerald-700",
    },
    invitation_accepted: {
      label: "Accepted an invitation",
      icon: Check,
      color: "bg-teal-50 text-teal-700",
    },
    settings_updated: {
      label: "Updated organization settings",
      icon: FilePenLine,
      color: "bg-sky-50 text-sky-700",
    },
  };
  const actionParts = action.split(".");
  const verb = actionParts[actionParts.length - 1] ?? action;
  return (
    actions[verb] ?? {
      label: action
        .split(".")
        .map((part) => part.replaceAll("_", " "))
        .join(" · "),
      icon: Activity,
      color: "bg-slate-100 text-slate-600",
    }
  );
}

function humanizeLabel(value: string) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") return "Details updated";
  return String(value);
}

function flattenDetails(
  value: Record<string, unknown>,
  prefix = "",
): Array<{ label: string; value: string }> {
  return Object.entries(value).flatMap(([key, item]) => {
    const label = prefix ? `${prefix}.${key}` : key;
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item)
    ) {
      return flattenDetails(item as Record<string, unknown>, label);
    }
    return [{ label: humanizeLabel(label), value: displayValue(item) }];
  });
}

function getMetadataDetails(metadata: Record<string, unknown>) {
  const { before, after, ...rest } = metadata;
  const changes: Array<{ label: string; from: string; to: string }> = [];
  const beforeDetails =
    before && typeof before === "object" && !Array.isArray(before)
      ? flattenDetails(before as Record<string, unknown>)
      : [];
  const afterDetails =
    after && typeof after === "object" && !Array.isArray(after)
      ? flattenDetails(after as Record<string, unknown>)
      : [];
  const oldValues = new Map(beforeDetails.map((detail) => [detail.label, detail.value]));

  for (const detail of afterDetails) {
    const previous = oldValues.get(detail.label);
    if (previous !== undefined && previous !== detail.value) {
      changes.push({
        label: detail.label,
        from: previous,
        to: detail.value,
      });
    }
  }

  const details = flattenDetails(rest);
  if (beforeDetails.length && afterDetails.length && changes.length === 0) {
    return { details, changes: [] };
  }
  return { details, changes };
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function AuditEvent({ entry }: { entry: AuditEntry }) {
  const presentation = actionPresentation(entry.action, entry.targetType);
  const Icon = presentation.icon;
  const { details, changes } = getMetadataDetails(entry.metadata ?? {});
  const targetId = entry.targetId;
  const shortTargetId =
    targetId.length > 12
      ? `${targetId.slice(0, 6)}…${targetId.slice(-4)}`
      : targetId;

  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex gap-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${presentation.color}`}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                {presentation.label}
              </h3>
              <p className="mt-1 text-xs text-muted">
                By a workspace member
                {entry.actorId && (
                  <span title={entry.actorId}>
                    {" "}
                    · ID ending {entry.actorId.slice(-6)}
                  </span>
                )}
              </p>
            </div>
            <time
              dateTime={entry.timestamp}
              className="text-xs text-muted"
              title={new Date(entry.timestamp).toLocaleString()}
            >
              {formatTimestamp(entry.timestamp)}
            </time>
          </div>

          {details.length > 0 && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {details.map((detail) => (
                <div
                  key={`${detail.label}-${detail.value}`}
                  className="rounded-lg bg-slate-50 px-3 py-2"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {detail.label}
                  </dt>
                  <dd className="mt-1 break-words text-xs font-medium text-ink">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {changes.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Changes
              </p>
              {changes.map((change) => (
                <div
                  key={change.label}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="font-medium text-ink">{change.label}</span>
                  <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                    {change.from}
                  </span>
                  <ArrowRight size={13} className="text-muted" />
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                    {change.to}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted">
            {humanizeLabel(entry.targetType)} reference ·{" "}
            <span title={targetId}>{shortTargetId}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function AuditPage() {
  const { organizationId } = useWorkspace();
  const auditQuery = useAuditEntries(organizationId!);
  if (auditQuery.isLoading) return <LoadingState />;
  if (auditQuery.isError)
    return (
      <ErrorState
        message={auditQuery.error.message}
        retry={() => void auditQuery.refetch()}
      />
    );

  const entries = auditQuery.data?.entries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">
          TRANSPARENCY & TRUST
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Activity log
        </h1>
        <p className="mt-2 text-sm text-muted">
          See who changed what across your workspace.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Activity size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="mt-1 text-xs text-muted">
              Latest {entries.length}{" "}
              {entries.length === 1 ? "event" : "events"} in this organization
            </p>
          </div>
        </header>
        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nothing to report yet"
              message="Ticket, team, and settings changes will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <AuditEvent key={entry._id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-muted">
        Audit records are generated by the backend and cannot be edited or
        deleted.
      </p>
    </div>
  );
}
