import { useState } from "react";
import { CheckCircle2, MailPlus, ShieldCheck, UserRound, UserX, X } from "lucide-react";
import { useInviteMember } from "../../api/invitations/hook";
import {
  useMembers,
  useRemoveMember,
  useUpdateMember,
} from "../../api/team/hook";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { userFriendlyError } from "../../lib/userFriendlyError";
import type { Member, Role } from "../../types";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusPill } from "../../components/common/StatusPill";
import { hasPermission, PERMISSIONS, ROLES } from "../../constants/authorization";

const roleHelp: Record<Role, string> = {
  Owner: "Full control, including ownership and settings.",
  Admin: "Manage team, settings and all support work.",
  Manager: "Manage support work and view activity.",
  Member: "Work on tickets you created or are assigned.",
  Viewer: "Read-only access to workspace support data."
};

export function TeamPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "Owner">>("Member");
  const [inviteDraft, setInviteDraft] = useState<{ email: string; role: Exclude<Role, "Owner"> } | null>(null);
  const [sentInvitation, setSentInvitation] = useState<{ email: string; role: Exclude<Role, "Owner"> } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const membersQuery = useMembers(organizationId!);
  const addMember = useInviteMember(organizationId!);
  const updateMember = useUpdateMember(organizationId!);
  const removeMember = useRemoveMember(organizationId!);
  const current = membersQuery.data?.members.find((member) => member.userId === user?.uid);
  const canManage = hasPermission(current?.role, PERMISSIONS.MANAGE_TEAM);
  if (membersQuery.isLoading) return <LoadingState />;
  if (membersQuery.isError) return <ErrorState message={membersQuery.error.message} retry={() => void membersQuery.refetch()} />;
  const members = membersQuery.data?.members ?? [];

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-teal-700">PEOPLE & PERMISSIONS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Team members</h1><p className="mt-2 text-sm text-muted">Keep the right people close to every customer conversation.</p></div>
    {canManage && <form className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:grid-cols-[1fr_160px_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); addMember.reset(); setInviteDraft({ email: email.trim(), role }); }}>
      <label className="text-xs font-semibold">Invite by email<input className="field mt-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" /></label>
      <label className="text-xs font-semibold">Initial role<select className="field mt-2" value={role} onChange={(event) => setRole(event.target.value as Exclude<Role, "Owner">)}>{(["Admin", "Manager", "Member", "Viewer"] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
      <button disabled={addMember.isPending} className="btn-primary inline-flex items-center justify-center gap-2"><MailPlus size={15} />{addMember.isPending ? "Sending…" : "Invite Member"}</button>
    </form>}
    {inviteDraft && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !addMember.isPending) setInviteDraft(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invite-confirm-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><MailPlus size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Organization invitation</p><h2 id="invite-confirm-title" className="mt-1 text-xl font-semibold text-ink">Invite Member</h2></div></div><button type="button" aria-label="Close invitation dialog" disabled={addMember.isPending} className="rounded-lg p-2 text-muted hover:bg-slate-100 disabled:opacity-50" onClick={() => setInviteDraft(null)}><X size={18} /></button></div>
        <p className="mt-5 text-sm leading-6 text-muted">First, ask <strong className="text-ink">{inviteDraft.email}</strong> to register using this email address. When you confirm below, the pending invitation is saved. They can then log in with the same email and accept it when it appears in the app.</p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-ink">Invitation details</p><p className="mt-2 text-sm text-muted">Organization role: <strong className="text-ink">{inviteDraft.role}</strong></p><p className="mt-1 text-xs leading-5 text-muted">The invitation will be saved as pending. The invitee must sign in with the invited email before accepting.</p></div>
        {addMember.isError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{userFriendlyError(addMember.error, "Could not create the invitation.")}</p>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" disabled={addMember.isPending} onClick={() => setInviteDraft(null)}>Cancel</button><button type="button" disabled={addMember.isPending} className="btn-primary inline-flex items-center justify-center gap-2" onClick={() => addMember.mutate(inviteDraft, { onSuccess: (_data, invitation) => { setEmail(""); setInviteDraft(null); setSentInvitation(invitation); } })}><MailPlus size={15} />{addMember.isPending ? "Creating invitation…" : "Invite"}</button></div>
      </section>
    </div>}
    {sentInvitation && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSentInvitation(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invite-success-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CheckCircle2 size={22} /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Invitation created</p><h2 id="invite-success-title" className="mt-1 text-xl font-semibold text-ink">Your teammate can join</h2></div></div><button aria-label="Close invitation instructions" className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setSentInvitation(null)}><X size={18} /></button></div>
        <p className="mt-5 text-sm leading-6 text-muted">Ask <strong className="text-ink">{sentInvitation.email}</strong> to register or log in using this email. The pending invitation will appear after login and grant the assigned <strong className="text-ink">{sentInvitation.role}</strong> role once accepted.</p>
        <button className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700" onClick={() => setSentInvitation(null)}>Got it</button>
      </section>
    </div>}
    {(updateMember.isError || removeMember.isError) && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{userFriendlyError(updateMember.error ?? removeMember.error, "Could not update the team member.")}</p>}
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold">Your team</h2><p className="mt-1 text-xs text-muted">{members.filter((member) => member.status === "active").length} active members</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700"><UserRound size={17} /></span></div>{members.length ? <div className="divide-y divide-slate-100">{members.map((member) => <div key={member._id} className="flex flex-wrap items-center gap-4 px-5 py-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-ink">{member.email?.[0]?.toUpperCase() ?? member.userId[0]?.toUpperCase()}</div><div className="min-w-[160px] flex-1"><p className="text-sm font-medium">{member.email || member.userId}</p><p className="mt-1 text-xs text-muted">{member.userId}{member.userId === user?.uid ? " · You" : ""}</p></div><StatusPill status={member.role} /><StatusPill status={member.status === "active" ? "Open" : "Closed"} />
      {canManage && member.userId !== user?.uid && (member.role !== ROLES.OWNER || current?.role === ROLES.OWNER) && <><select aria-label={`Role for ${member.email || member.userId}`} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" value={member.role} onChange={(event) => { const nextRole = event.target.value as Role; if (nextRole !== ROLES.OWNER || window.confirm("Grant this teammate Owner privileges?")) updateMember.mutate({ memberId: member._id, value: { role: nextRole } }); }}>{(current?.role === ROLES.OWNER ? [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER] : [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER]).map((item) => <option key={item}>{item}</option>)}</select><button type="button" title="Remove member" aria-label={`Remove ${member.email || member.userId}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => { removeMember.reset(); setMemberToRemove(member); }}><UserX size={16} /></button></>}
    </div>)}</div> : <div className="p-5"><EmptyState title="No team members yet" message="Invite teammates by email to give them access to this workspace." /></div>}</section>
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-teal-700" /><h2 className="font-semibold">Roles at a glance</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(roleHelp).map(([name, description]) => <div className="rounded-xl bg-slate-50 p-4" key={name}><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div>)}</div></section>
    <ConfirmDialog
      open={memberToRemove !== null}
      title="Remove this team member?"
      description={memberToRemove ? `${memberToRemove.email || memberToRemove.userId} will lose access to this organization.` : ""}
      confirmLabel="Remove member"
      pendingLabel="Removing…"
      pending={removeMember.isPending}
      error={removeMember.isError ? userFriendlyError(removeMember.error, "Could not remove this team member.") : undefined}
      onClose={() => {
        if (!removeMember.isPending) {
          setMemberToRemove(null);
          removeMember.reset();
        }
      }}
      onConfirm={() => {
        if (memberToRemove)
          removeMember.mutate(memberToRemove._id, {
            onSuccess: () => setMemberToRemove(null),
          });
      }}
    />
  </div>;
}
