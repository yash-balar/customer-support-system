import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, MessageCircle, Ticket, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api, queryKeys } from "../services/api";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import type { Conversation, Ticket as SupportTicket } from "../types";
import { EmptyState, ErrorState, LoadingState } from "../components/States";

export function OverviewPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const tickets = useQuery({
    queryKey: queryKeys.tickets(organizationId!, "dashboard"),
    queryFn: () => api<{ tickets: SupportTicket[]; pagination: { total: number } }>(`/organizations/${organizationId}/tickets?limit=100`)
  });
  const conversations = useQuery({
    queryKey: queryKeys.conversations(organizationId!),
    queryFn: () => api<{ conversations: Conversation[] }>(`/organizations/${organizationId}/conversations`)
  });
  if (tickets.isLoading || conversations.isLoading) return <LoadingState />;
  if (tickets.isError) return <ErrorState message={tickets.error.message} retry={() => void tickets.refetch()} />;
  const list = tickets.data?.tickets ?? [];
  const open = list.filter((ticket) => ticket.status === "Open" || ticket.status === "In Progress").length;
  const resolved = list.filter((ticket) => ticket.status === "Resolved" || ticket.status === "Closed").length;
  const urgent = list.filter((ticket) => ticket.priority === "Urgent").length;
  const cards = [
    { label: "Active tickets", value: open, note: "Needs your team’s attention", icon: Ticket, tint: "bg-teal-50 text-teal-700" },
    { label: "Urgent priority", value: urgent, note: "Keep these moving first", icon: Clock3, tint: "bg-orange-50 text-orange-600" },
    { label: "Conversations", value: conversations.data?.conversations.length ?? 0, note: "Customer threads in workspace", icon: MessageCircle, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Resolved", value: resolved, note: "Tickets wrapped up", icon: Users, tint: "bg-emerald-50 text-emerald-700" }
  ];
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-teal-700">YOUR TEAM, AT A GLANCE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Good to see you, {user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there"}.</h1><p className="mt-2 text-sm text-muted">Here’s what’s happening across your support desk today.</p></div><Link to="/app/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">View all tickets<ArrowUpRight size={15} /></Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, note, icon: Icon, tint }) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}><Icon size={18} /></span></div><p className="mt-3 text-xs text-muted">{note}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">Recently updated tickets</h2><p className="mt-1 text-xs text-muted">Your team’s latest customer requests</p></div><Link to="/app/tickets" className="text-xs font-semibold text-teal-700">See tickets</Link></div><div className="mt-5 divide-y divide-slate-100">{list.slice(0, 5).map((ticket) => <Link to={`/app/tickets/${ticket._id}`} key={ticket._id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{ticket.title}</p><p className="mt-1 text-xs text-muted">{ticket.customerName} · {new Date(ticket.createdAt).toLocaleDateString()}</p></div><StatusPill status={ticket.status} /></Link>)}{!list.length && <EmptyState title="A fresh start" message="Create a ticket and it will show up here." />}</div></section>
      <section className="rounded-2xl bg-gradient-to-br from-ink to-[#244858] p-6 text-white"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><MessageCircle size={19} /></div><h2 className="mt-5 text-xl font-semibold">Every conversation, together.</h2><p className="mt-2 text-sm leading-6 text-slate-300">Keep your support team in sync with live customer threads and instant updates.</p><Link to="/app/conversations" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-200">Open conversations<ArrowUpRight size={15} /></Link></section>
    </div>
  </div>;
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = { Open: "bg-sky-50 text-sky-700", "In Progress": "bg-amber-50 text-amber-700", Resolved: "bg-emerald-50 text-emerald-700", Closed: "bg-slate-100 text-slate-600", Urgent: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-indigo-50 text-indigo-700", Low: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}
