import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Headset,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import {
  hasPermission,
  PERMISSIONS,
  ROLES,
  type Role,
} from "../../constants/authorization";
import type { Organization } from "../../types";

const workflow = [
  {
    number: "01",
    title: "Capture the request",
    description:
      "Create a ticket for a customer issue or start a live conversation. Add the context your team needs to respond.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Assign and prioritize",
    description:
      "Set priority, status, and an owner so every request has a clear next step and responsible teammate.",
    icon: Users,
  },
  {
    number: "03",
    title: "Work together",
    description:
      "Update tickets and reply to conversations from the workspace. Teammates see current information as work progresses.",
    icon: MessageCircle,
  },
  {
    number: "04",
    title: "Review the outcome",
    description:
      "Use the overview to follow the queue and the activity log to review recorded changes across the organization.",
    icon: Activity,
  },
];

const modules = [
  {
    title: "Overview",
    description: "A quick view of support activity and the current workload.",
    icon: Headset,
    to: "/app",
  },
  {
    title: "Tickets",
    description:
      "Track customer requests, filter the queue, and manage status, priority, and assignment.",
    icon: ClipboardList,
    to: "/app/tickets",
  },
  {
    title: "Live conversations",
    description:
      "Manage customer conversations, replies, status, and ownership in one place.",
    icon: MessageCircle,
    to: "/app/conversations",
  },
  {
    title: "Team members",
    description:
      "Invite teammates and coordinate access through organization roles.",
    icon: Users,
    to: "/app/team",
  },
  {
    title: "Activity log",
    description: "Review important workspace changes recorded by the server.",
    icon: Activity,
    to: "/app/audit",
    permission: PERMISSIONS.VIEW_AUDIT,
  },
  {
    title: "Organization settings",
    description: "Manage workspace settings when your role has permission.",
    icon: Settings2,
    to: "/app/settings",
    permission: PERMISSIONS.MANAGE_SETTINGS,
  },
];

const permissionsByRole: Record<Role, string[]> = {
  [ROLES.OWNER]: ["All workspace features"],
  [ROLES.ADMIN]: ["Manage tickets, team, settings, and activity"],
  [ROLES.MANAGER]: ["Manage tickets and conversations", "View activity"],
  [ROLES.MEMBER]: ["Create and work on assigned support requests"],
  [ROLES.VIEWER]: ["No management actions by default"],
};

export function HowItWorksPage() {
  const { organization } = useOutletContext<{ organization?: Organization }>();
  const role = organization?.role;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white shadow-card sm:px-10 sm:py-11">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-100">
            <BookOpenCheck size={15} />
            Product guide
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            How Northstar Desk works
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            A shared workspace for capturing customer requests, coordinating
            support, and keeping a clear record of what changed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app/tickets"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              Explore tickets <ArrowRight size={16} />
            </Link>
            <Link
              to="/app/conversations"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View conversations
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-16 hidden h-72 w-72 rounded-full border-[36px] border-teal-500/10 sm:block" />
        <div className="pointer-events-none absolute bottom-[-100px] right-36 hidden h-52 w-52 rounded-full bg-teal-500/10 blur-2xl sm:block" />
      </section>

      <section aria-labelledby="workflow-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-teal-700">
            The support workflow
          </p>
          <h2
            id="workflow-heading"
            className="mt-1 text-xl font-semibold tracking-tight"
          >
            From incoming request to resolution
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workflow.map(({ number, title, description, icon: Icon }) => (
            <article
              key={number}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon size={19} />
                </span>
                <span className="text-xs font-bold tracking-widest text-slate-300">
                  {number}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-teal-700">
            Workspace tour
          </p>
          <h2
            id="modules-heading"
            className="mt-1 text-xl font-semibold tracking-tight"
          >
            What you can do here
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules
            .filter(
              (module) =>
                !module.permission || hasPermission(role, module.permission),
            )
            .map(({ title, description, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-teal-100"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-teal-700 transition group-hover:bg-teal-50">
                  <Icon size={19} />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {title}
                    <ArrowRight
                      size={14}
                      className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700"
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {description}
                  </span>
                </span>
              </Link>
            ))}
        </div>
      </section>

      <section
        aria-labelledby="roles-heading"
        className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"
      >
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 id="roles-heading" className="text-sm font-semibold">
              Roles keep access appropriate
            </h2>
            <p className="mt-1 text-xs text-muted">
              The actions available in your workspace depend on your role.
            </p>
          </div>
        </header>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-5">
          {Object.entries(permissionsByRole).map(([roleName, capabilities]) => (
            <div
              key={roleName}
              className="border-slate-100 p-4 sm:border-r xl:last:border-r-0"
            >
              <p className="text-xs font-semibold text-ink">{roleName}</p>
              <ul className="mt-2 space-y-2">
                {capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="flex gap-2 text-[11px] leading-4 text-muted"
                  >
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 shrink-0 text-teal-600"
                    />
                    {capability}
                  </li>
                ))}
              </ul>
              {role === roleName && (
                <span className="mt-3 inline-flex rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">
                  Your role
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs leading-5 text-muted">
        Changes are saved through the workspace and important actions are
        recorded in the activity log for authorized roles.
      </p>
    </div>
  );
}
