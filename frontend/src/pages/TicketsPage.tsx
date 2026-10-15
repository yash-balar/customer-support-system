import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, queryKeys } from "../services/api";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import type { Member, Priority, Ticket, TicketStatus } from "../types";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusPill } from "./OverviewPage";

const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
const statuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];
const formSchema = z.object({
  title: z.string().trim().min(2, "Add a short subject.").max(160),
  customerName: z.string().trim().min(1, "Enter the customer name.").max(120),
  customerEmail: z.string().email("Enter a valid email."),
  description: z.string().trim().min(1, "Add a description.").max(10000),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"])
});
type TicketFormValues = z.infer<typeof formSchema>;

export function TicketsPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const filterString = searchParams.toString();
  const ticketsQuery = useQuery({
    queryKey: queryKeys.tickets(organizationId!, filterString),
    queryFn: () => api<{ tickets: Ticket[]; pagination: { page: number; pages: number; total: number } }>(`/organizations/${organizationId}/tickets?${filterString}`)
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(organizationId!),
    queryFn: () => api<{ members: Member[] }>(`/organizations/${organizationId}/members`)
  });
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }
  const list = ticketsQuery.data?.tickets ?? [];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-teal-700">SUPPORT QUEUE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Tickets</h1><p className="mt-2 text-sm text-muted">Find, prioritize and resolve customer requests.</p></div>{membersQuery.data?.members.find((member) => member.userId === user?.uid)?.role !== "Viewer" && <Link to="/app/tickets/new" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />New ticket</Link>}</div>
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><SlidersHorizontal size={15} /><span className="font-semibold text-ink">Filter tickets</span><span>· Dates use ticket creation time</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="field pl-9" placeholder="Search tickets…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") updateFilter("search", search.trim()); }} /></label>
        <select className="field" aria-label="Status filter" value={status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">Any status</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select className="field" aria-label="Priority filter" value={priority} onChange={(event) => updateFilter("priority", event.target.value)}><option value="">Any priority</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select>
        <select className="field" aria-label="Assignee filter" value={assigneeId} onChange={(event) => updateFilter("assigneeId", event.target.value)}><option value="">Any assignee</option>{membersQuery.data?.members.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.email || member.userId}</option>)}</select>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:max-w-lg"><label className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field pl-9" type="date" aria-label="Created from date" value={startDate} onChange={(event) => updateFilter("startDate", event.target.value)} /></label><label className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field pl-9" type="date" aria-label="Created through date" value={endDate} onChange={(event) => updateFilter("endDate", event.target.value)} /></label></div>
      <button className="mt-3 text-xs font-semibold text-teal-700" onClick={() => { setSearch(""); setSearchParams({}); }}>Clear filters</button>
    </section>
    {ticketsQuery.isLoading ? <LoadingState label="Loading tickets…" /> : ticketsQuery.isError ? <ErrorState message={ticketsQuery.error.message} retry={() => void ticketsQuery.refetch()} /> : list.length === 0 ? <EmptyState title="No matching tickets" message="Try a different search or date range, or create a new ticket." /> :
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Ticket / customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Created</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{list.map((ticket) => <tr key={ticket._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><Link to={`/app/tickets/${ticket._id}`} className="font-semibold text-ink hover:text-teal-700">{ticket.title}</Link><p className="mt-1 text-xs text-muted">{ticket.customerName} · {ticket.customerEmail}</p></td><td className="px-4 py-4"><StatusPill status={ticket.status} /></td><td className="px-4 py-4"><StatusPill status={ticket.priority} /></td><td className="px-4 py-4 text-xs text-muted">{membersQuery.data?.members.find((member) => member.userId === ticket.assigneeId)?.email ?? (ticket.assigneeId ? ticket.assigneeId : "Unassigned")}</td><td className="px-4 py-4 text-xs text-muted">{new Date(ticket.createdAt).toLocaleDateString()}</td><td className="px-4 py-4">{["Owner", "Admin", "Manager"].includes(membersQuery.data?.members.find((member) => member.userId === user?.uid)?.role ?? "") && <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete ticket" onClick={() => { if (window.confirm(`Delete “${ticket.title}”? This cannot be undone.`)) void api(`/organizations/${organizationId}/tickets/${ticket._id}`, { method: "DELETE" }).then(() => void ticketsQuery.refetch()).catch((error: Error) => window.alert(error.message)); }}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-muted"><span>{ticketsQuery.data?.pagination.total ?? 0} tickets · Page {page} of {ticketsQuery.data?.pagination.pages ?? 1}</span><div className="flex gap-2"><button className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page <= 1} onClick={() => updateFilter("page", String(page - 1))}><ArrowLeft size={15} /></button><button className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page >= (ticketsQuery.data?.pagination.pages ?? 1)} onClick={() => updateFilter("page", String(page + 1))}><ArrowRight size={15} /></button></div></div></section>}
  </div>;
}

export function TicketFormPage() {
  const { organizationId } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", customerName: "", customerEmail: "", description: "", priority: "Medium", status: "Open" }
  });
  const mutation = useMutation({
    mutationFn: (values: TicketFormValues) => api<{ ticket: Ticket }>(`/organizations/${organizationId}/tickets`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async ({ ticket }) => {
      await queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] });
      navigate(`/app/tickets/${ticket._id}`);
    }
  });
  return <div className="mx-auto max-w-3xl"><Link to="/app/tickets" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} />Back to tickets</Link><div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-semibold text-teal-700">NEW CUSTOMER REQUEST</p><h1 className="mt-2 text-2xl font-semibold">Create a ticket</h1><p className="mt-2 text-sm text-muted">Capture the details so your team can take it from here.</p>  <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Field label="Subject" error={errors.title?.message} className="sm:col-span-2"><input className="field" placeholder="What does the customer need help with?" {...register("title")} /></Field>
      <Field label="Customer name" error={errors.customerName?.message}><input className="field" {...register("customerName")} /></Field><Field label="Customer email" error={errors.customerEmail?.message}><input className="field" type="email" {...register("customerEmail")} /></Field>
      <Field label="Priority" error={errors.priority?.message}><select className="field" {...register("priority")}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Status" error={errors.status?.message}><select className="field" {...register("status")}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Description" error={errors.description?.message} className="sm:col-span-2"><textarea className="field min-h-32 resize-y" placeholder="Add useful context for the support team…" {...register("description")} /></Field>
      {mutation.isError && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{mutation.error.message}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => navigate("/app/tickets")}>Cancel</button><button disabled={isSubmitting || mutation.isPending} className="btn-primary">{mutation.isPending ? "Creating…" : "Create ticket"}</button></div>
    </form></div></div>;
}

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const { organizationId } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ticketQuery = useQuery({ queryKey: ["ticket", organizationId, ticketId], queryFn: () => api<{ ticket: Ticket }>(`/organizations/${organizationId}/tickets/${ticketId}`) });
  const memberQuery = useQuery({ queryKey: queryKeys.members(organizationId!), queryFn: () => api<{ members: Member[] }>(`/organizations/${organizationId}/members`) });
  const ticket = ticketQuery.data?.ticket;
  const currentMembership = memberQuery.data?.members.find((member) => member.userId === user?.uid);
  const canEditTicket = currentMembership?.role === "Owner" || currentMembership?.role === "Admin" || currentMembership?.role === "Manager" ||
    currentMembership?.role === "Member" && (ticket?.creatorId === user?.uid || ticket?.assigneeId === user?.uid);
  const canAssignTicket = currentMembership?.role === "Owner" || currentMembership?.role === "Admin" || currentMembership?.role === "Manager";
  const { register, handleSubmit, formState: { errors } } = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    values: ticket ? { title: ticket.title, customerName: ticket.customerName, customerEmail: ticket.customerEmail, description: ticket.description, priority: ticket.priority, status: ticket.status } : undefined
  });
  const mutation = useMutation({
    mutationFn: (values: TicketFormValues) => api<{ ticket: Ticket }>(`/organizations/${organizationId}/tickets/${ticketId}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: async ({ ticket: updated }) => {
      queryClient.setQueryData(["ticket", organizationId, ticketId], { ticket: updated });
      await queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] });
    }
  });
  const assign = useMutation({
    mutationFn: (assigneeId: string | null) => api(`/organizations/${organizationId}/tickets/${ticketId}`, { method: "PATCH", body: JSON.stringify({ assigneeId }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["ticket", organizationId, ticketId] }); await queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] }); }
  });
  if (ticketQuery.isLoading) return <LoadingState />;
  if (ticketQuery.isError || !ticket) return <ErrorState message={ticketQuery.error?.message ?? "Ticket not found."} retry={() => void ticketQuery.refetch()} />;
  return <div className="mx-auto max-w-3xl"><Link to="/app/tickets" className="inline-flex items-center gap-2 text-sm font-medium text-muted"><ArrowLeft size={16} />Back to tickets</Link><div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal-700">TICKET DETAILS</p><h1 className="mt-2 text-2xl font-semibold">{ticket.title}</h1></div><StatusPill status={ticket.status} /></div><p className="mt-2 text-sm text-muted">Created {new Date(ticket.createdAt).toLocaleString()} · {ticket.customerName} ({ticket.customerEmail})</p>
      <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}><Field label="Subject" error={errors.title?.message} className="sm:col-span-2"><input className="field" readOnly={!canEditTicket} {...register("title")} /></Field><Field label="Customer name" error={errors.customerName?.message}><input className="field" readOnly={!canEditTicket} {...register("customerName")} /></Field><Field label="Customer email" error={errors.customerEmail?.message}><input className="field" type="email" readOnly={!canEditTicket} {...register("customerEmail")} /></Field><Field label="Status"><select className="field" disabled={!canEditTicket} {...register("status")}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Priority"><select className="field" disabled={!canEditTicket} {...register("priority")}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></Field>{canAssignTicket ? <Field label="Assigned to"><select className="field" value={ticket.assigneeId ?? ""} onChange={(event) => assign.mutate(event.target.value || null)}><option value="">Unassigned</option>{memberQuery.data?.members.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.email || member.userId}</option>)}</select></Field> : <Field label="Assigned to"><input className="field" readOnly value={memberQuery.data?.members.find((member) => member.userId === ticket.assigneeId)?.email ?? ticket.assigneeId ?? "Unassigned"} /></Field>}<Field label="Description" className="sm:col-span-2"><textarea className="field min-h-36" readOnly={!canEditTicket} {...register("description")} /></Field>{(mutation.isError || assign.isError) && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{mutation.error?.message ?? assign.error?.message}</p>}{canEditTicket && <div className="flex justify-end border-t border-slate-100 pt-5 sm:col-span-2"><button disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? "Saving…" : "Save changes"}</button></div>}</form>
      {currentMembership?.role === "Member" && !canEditTicket && <p className="mt-3 text-xs text-muted">This ticket is outside your editing scope.</p>}
      {["Owner", "Admin", "Manager"].includes(currentMembership?.role ?? "") && <button className="mt-5 text-xs font-semibold text-rose-600" onClick={() => { if (window.confirm("Delete this ticket permanently?")) void api(`/organizations/${organizationId}/tickets/${ticket._id}`, { method: "DELETE" }).then(() => { void queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] }); navigate("/app/tickets"); }).catch((error: Error) => window.alert(error.message)); }}>Delete ticket</button>}
    </div></div>;
}

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return <label className={`block text-sm font-medium text-ink ${className}`}>{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-xs font-normal text-rose-600">{error}</span>}</label>;
}
