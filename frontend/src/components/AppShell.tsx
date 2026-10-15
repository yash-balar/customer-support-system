import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Headset,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  Settings2,
  Shield,
  Ticket,
  Users,
} from "lucide-react";
import { io } from "socket.io-client";
import { firebaseAuth } from "../lib/firebase";
import { userFriendlyError } from "../lib/userFriendlyError";
import { ConfirmDialog } from "./ConfirmDialog";
import { queryKeys } from "../api/queryKeys";
import { useAcceptInvitation, useInvitations } from "../api/invitations/hook";
import type { PendingInvitation } from "../api/invitations/service";
import {
  useCreateOrganization,
  useOrganizations,
} from "../api/organizations/hook";
import { useSignOut } from "../api/auth/hook";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { ErrorState, LoadingState } from "./States";
import { hasPermission, PERMISSIONS } from "../constants/authorization";

export function AppShell({ sidebar = true }: { sidebar?: boolean }) {
  const { user } = useAuth();
  const { organizationId, setOrganizationId } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const organizationsQuery = useOrganizations({
    retry: (count, error) =>
      count < 1 &&
      ![401, 403].includes((error as Error & { status?: number }).status ?? 0),
  });
  const invitationsQuery = useInvitations(user?.uid);
  const pendingInvitations = invitationsQuery.data?.invitations ?? [];
  const acceptInvitation = useAcceptInvitation();
  const logout = useSignOut();
  const handleAcceptInvitation = (invitationId: string) => {
    acceptInvitation.mutate(invitationId, {
      onSuccess: async (result) => {
        setOrganizationId(result.membership.organizationId);
        await logout.mutateAsync();
        queryClient.clear();
        navigate("/login", {
          replace: true,
          state: {
            notice:
              "Invitation accepted. Sign in again to open your workspace.",
          },
        });
      },
    });
  };
  const organizations = organizationsQuery.data?.organizations ?? [];
  const organization = organizations.find(
    (item) => item._id === organizationId,
  );

  useEffect(() => {
    if (!organizations.length) setOrganizationId(null);
    else if (!organization) setOrganizationId(organizations[0]._id);
  }, [organizations, organization, setOrganizationId]);

  useEffect(() => {
    if (!organizationId || !firebaseAuth?.currentUser) return;
    let active = true;
    let socket: ReturnType<typeof io> | undefined;
    void firebaseAuth.currentUser.getIdToken().then((token) => {
      if (!active) return;
      socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000", {
        auth: { token },
        reconnection: true,
      });
      socket.on("connect", () =>
        socket?.emit("organization:join", organizationId),
      );
      const refreshTickets = () =>
        void queryClient.invalidateQueries({
          queryKey: ["tickets", organizationId],
        });
      const refreshConversations = () =>
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations(organizationId),
        });
      ["ticket:created", "ticket:updated", "ticket:deleted"].forEach((event) =>
        socket?.on(event, refreshTickets),
      );
      ["conversation:updated", "conversation:deleted"].forEach((event) =>
        socket?.on(event, refreshConversations),
      );
      socket.on("message:created", () => {
        refreshConversations();
        void queryClient.invalidateQueries({
          queryKey: ["messages", organizationId],
        });
      });
      socket.on("membership:revoked", (revokedOrganizationId: string) => {
        if (revokedOrganizationId !== organizationId) return;
        setOrganizationId(null);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.organizations,
        });
      });
    });
    return () => {
      active = false;
      socket?.emit("organization:leave", organizationId);
      socket?.disconnect();
    };
  }, [organizationId, queryClient]);

  if (organizationsQuery.isLoading || invitationsQuery.isLoading)
    return <LoadingState />;
  if (organizationsQuery.isError)
    return (
      <div className="mx-auto mt-12 max-w-xl px-5">
        <ErrorState
          message={organizationsQuery.error.message}
          retry={() => void organizationsQuery.refetch()}
        />
      </div>
    );
  if (invitationsQuery.isError)
    return (
      <div className="mx-auto mt-12 max-w-xl px-5">
        <ErrorState
          message={`We couldn't check your invitations: ${invitationsQuery.error.message}`}
          retry={() => void invitationsQuery.refetch()}
        />
      </div>
    );
  if (!organizationId || organizations.length === 0)
    return (
      <>
        <OrganizationSetup
          onCreated={() => void organizationsQuery.refetch()}
          invitations={pendingInvitations}
          accepting={acceptInvitation.isPending}
          acceptError={
            acceptInvitation.isError
              ? userFriendlyError(
                  acceptInvitation.error,
                  "Could not accept this invitation.",
                )
              : undefined
          }
          onAccept={handleAcceptInvitation}
        />
      </>
    );

  const navItems = [
    { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/app/tickets", label: "Tickets", icon: Ticket },
    {
      to: "/app/conversations",
      label: "Live conversations",
      icon: MessageCircle,
    },
    { to: "/app/team", label: "Team members", icon: Users },
    { to: "/app/how-it-works", label: "How it works", icon: BookOpenCheck },
    ...(hasPermission(organization?.role, PERMISSIONS.VIEW_AUDIT)
      ? [{ to: "/app/audit", label: "Activity log", icon: Activity }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      {sidebar && isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {sidebar && (
        <aside
          id="app-sidebar"
          aria-label="Main navigation"
          className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col bg-ink py-5 text-white transition-all duration-200 ${
            isSidebarOpen
              ? "w-64 translate-x-0 px-4 md:px-5"
              : "w-64 -translate-x-full px-4 md:w-16 md:translate-x-0 md:px-2"
          }`}
        >
          <a
            href="/app"
            aria-label="Northstar overview"
            title={!isSidebarOpen ? "Northstar Desk" : undefined}
            className={`flex items-center px-2 ${isSidebarOpen ? "gap-3" : "justify-center"}`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500">
              <Headset size={20} />
            </span>
            {isSidebarOpen && (
              <span className="font-semibold tracking-tight">
                northstar
                <span className="ml-1 font-normal text-slate-400">desk</span>
              </span>
            )}
          </a>
          {isSidebarOpen && (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">
                Workspace
              </p>
              <select
                aria-label="Select organization"
                className="mt-2 w-full bg-transparent text-sm font-medium text-white outline-none"
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  void queryClient.removeQueries({ queryKey: ["tickets"] });
                  void queryClient.removeQueries({
                    queryKey: ["conversations"],
                  });
                }}
              >
                {organizations.map((item) => (
                  <option className="bg-ink" key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 inline-block rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-semibold text-teal-200">
                {organization?.role ?? "Member"}
              </span>
            </div>
          )}
          {isSidebarOpen && (
            <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
              Workspace
            </p>
          )}
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={!isSidebarOpen ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl py-2.5 text-sm transition ${isSidebarOpen ? "gap-3 px-3" : "justify-center px-0"} ${isActive ? "bg-white/10 font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`
                }
              >
                <Icon size={17} />
                {isSidebarOpen && label}
              </NavLink>
            ))}
          </nav>
          {hasPermission(organization?.role, PERMISSIONS.MANAGE_SETTINGS) && (
            <NavLink
              to="/app/settings"
              title={!isSidebarOpen ? "Organization settings" : undefined}
              className={({ isActive }) =>
                `mt-1 flex items-center rounded-xl py-2.5 text-sm transition ${isSidebarOpen ? "gap-3 px-3" : "justify-center px-0"} ${isActive ? "bg-white/10 font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Settings2 size={17} />
              {isSidebarOpen && "Organization settings"}
            </NavLink>
          )}
          {isSidebarOpen && (
            <div className="mt-auto hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-600 p-4 md:block">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                <Shield size={16} />
              </div>
              <p className="text-sm font-semibold">Support, in sync.</p>
              <p className="mt-1 text-xs leading-5 text-teal-50/80">
                Your team sees the latest updates in real time.
              </p>
            </div>
          )}
          <div
            className={`flex items-center border-t border-white/10 pt-4 ${
              isSidebarOpen
                ? "mt-auto gap-3 md:mt-5"
                : "mt-auto flex-col justify-center gap-2"
            }`}
          >
            {isSidebarOpen && (
              <>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-600 text-sm font-semibold">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {user?.email}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Signed in</p>
                </div>
              </>
            )}
            <button
              type="button"
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                logout.reset();
                setLogoutDialogOpen(true);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
      )}
      <main
        className={`min-h-screen flex-1 transition-[margin] duration-200 ${
          sidebar ? (isSidebarOpen ? "md:ml-64" : "md:ml-16") : ""
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {sidebar && (
              <button
                type="button"
                aria-label={
                  isSidebarOpen ? "Collapse navigation" : "Expand navigation"
                }
                aria-expanded={isSidebarOpen}
                aria-controls="app-sidebar"
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-ink"
                onClick={() => setIsSidebarOpen((open) => !open)}
              >
                {isSidebarOpen ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs text-muted">
                {organization?.name}
              </p>
              <p className="text-sm font-semibold text-ink">
                Customer support workspace
              </p>
            </div>
          </div>
          {hasPermission(organization?.role, PERMISSIONS.CREATE_TICKET) && (
            <button
              onClick={() => navigate("/app/tickets/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus size={15} />
              New ticket
            </button>
          )}
        </header>
        <div className="mx-auto space-y-5 p-5 sm:p-8">
          <InvitationCards
            invitations={pendingInvitations}
            accepting={acceptInvitation.isPending}
            acceptError={
              acceptInvitation.isError
                ? userFriendlyError(
                    acceptInvitation.error,
                    "Could not accept this invitation.",
                  )
                : undefined
            }
            onAccept={handleAcceptInvitation}
          />
          <Outlet context={{ organization, organizations }} />
        </div>
      </main>
      <ConfirmDialog
        open={logoutDialogOpen}
        title="Sign out?"
        description="You will be signed out of your support workspace on this device."
        confirmLabel="Sign out"
        pendingLabel="Signing out…"
        pending={logout.isPending}
        error={logout.error?.message}
        onClose={() => {
          if (!logout.isPending) {
            setLogoutDialogOpen(false);
            logout.reset();
          }
        }}
        onConfirm={() =>
          logout.mutate(undefined, {
            onSuccess: () => {
              queryClient.clear();
              setOrganizationId(null);
              setLogoutDialogOpen(false);
            },
          })
        }
      />
    </div>
  );
}

function InvitationCards({
  invitations,
  accepting,
  acceptError,
  onAccept,
}: {
  invitations: PendingInvitation[];
  accepting: boolean;
  acceptError?: string;
  onAccept: (invitationId: string) => void;
}) {
  if (!invitations.length) return null;

  return (
    <section aria-label="Organization invitations" className="space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation._id}
          className="flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-ink">
              {invitation.organizationId.name} invited you
            </p>
            <p className="mt-1 text-sm text-muted">
              You’ve been invited as{" "}
              <strong className="text-ink">{invitation.role}</strong> using{" "}
              {invitation.email}.
            </p>
            {acceptError && (
              <p role="alert" className="mt-2 text-sm text-rose-700">
                {acceptError}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={accepting}
            className="shrink-0 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
            onClick={() => onAccept(invitation._id)}
          >
            {accepting ? "Accepting…" : "Accept invitation"}
          </button>
        </div>
      ))}
    </section>
  );
}

function OrganizationSetup({
  onCreated,
  invitations,
  accepting,
  acceptError,
  onAccept,
}: {
  onCreated: () => void;
  invitations: PendingInvitation[];
  accepting: boolean;
  acceptError?: string;
  onAccept: (invitationId: string) => void;
}) {
  const { setOrganizationId } = useWorkspace();
  const createOrganization = useCreateOrganization();
  const [name, setName] = useState("");

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-card sm:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <Headset />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-ink">
          {invitations.length
            ? "You’re invited to an organization"
            : "Create your workspace"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {invitations.length
            ? "Review your pending invitation below. Accept it to join with the role assigned by the organization."
            : "Start a team workspace to organize tickets and customer conversations. You’ll be its Owner."}
        </p>
        {invitations.length > 0 && (
          <div className="mt-6">
            <InvitationCards
              invitations={invitations}
              accepting={accepting}
              acceptError={acceptError}
              onAccept={onAccept}
            />
          </div>
        )}
        {!invitations.length && (
          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createOrganization.mutate(
                { name },
                {
                  onSuccess: ({ organization }) => {
                    setOrganizationId(organization._id);
                    onCreated();
                  },
                },
              );
            }}
          >
            <label className="block text-sm font-medium">
              Workspace name
              <input
                className="field mt-2"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Acme Support"
              />
            </label>
            {createOrganization.isError && (
              <p role="alert" className="text-sm text-rose-600">
                {createOrganization.error.message}
              </p>
            )}
            <button
              disabled={createOrganization.isPending}
              className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createOrganization.isPending ? "Creating…" : "Create workspace"}
            </button>
          </form>
        )}
        <div className="mt-7 border-t border-slate-100 pt-5 text-xs text-muted">
          Workspace membership is verified on the server before any private data
          is shown.
        </div>
      </div>
    </div>
  );
}
