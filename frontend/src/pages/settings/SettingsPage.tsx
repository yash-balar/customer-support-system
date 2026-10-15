import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import {
  useOrganizations,
  useUpdateOrganizationSettings,
} from "../../api/organizations/hook";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { ErrorState, LoadingState } from "../../components/States";

export function SettingsPage() {
  const { organizationId } = useWorkspace();
  const organizationsQuery = useOrganizations();
  const organization = organizationsQuery.data?.organizations.find(
    (item) => item._id === organizationId,
  );
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setSupportEmail(organization.settings?.supportEmail ?? "");
    setTimezone(organization.settings?.timezone ?? "UTC");
  }, [organization]);
  const mutation = useUpdateOrganizationSettings(organizationId!);
  const saveSettings = () =>
    mutation.mutate({ name, supportEmail, timezone });
  if (organizationsQuery.isLoading) return <LoadingState />;
  if (organizationsQuery.isError || !organization)
    return (
      <ErrorState
        message={organizationsQuery.error?.message ?? "Workspace not found."}
        retry={() => void organizationsQuery.refetch()}
      />
    );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">
          WORKSPACE PREFERENCES
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Organization settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Make this workspace feel like your team.
        </p>
      </div>
      <form
        className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          saveSettings();
        }}
      >
        <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Building2 size={19} />
          </span>
          <div>
            <h2 className="font-semibold">Workspace identity</h2>
            <p className="mt-1 text-xs text-muted">
              These details are shared with active organization members.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium">
            Organization name
            <input
              className="field mt-2"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Support email
            <input
              className="field mt-2"
              type="email"
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              placeholder="support@company.com"
            />
          </label>
          <label className="block text-sm font-medium">
            Timezone
            <input
              className="field mt-2"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="UTC"
            />
          </label>
        </div>
        {mutation.isError && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-4 text-sm text-teal-700">
            Settings saved successfully.
          </p>
        )}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <button
            className="btn-primary inline-flex items-center gap-2"
            disabled={mutation.isPending}
          >
            <Save size={15} />
            {mutation.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
      <p className="text-xs leading-5 text-muted">
        Only Owners and Admins can change organization settings. Every
        successful change is recorded in the immutable audit log.
      </p>
    </div>
  );
}
