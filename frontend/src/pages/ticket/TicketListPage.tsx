import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Ticket } from "../../types";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/common";
import { hasPermission, PERMISSIONS } from "../../constants/authorization";
import { StatusPill } from "../../components/common/StatusPill";
import { priorities, statuses } from "./shared";
import {
  formatLocalDate,
  updateTicketDateFilter,
  updateTicketFilters,
} from "./filters";
import { useDeleteTicket, useTickets } from "../../api/tickets/hook";
import { useMembers } from "../../api/team/hook";

export function TicketListPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch === (searchParams.get("search") ?? "")) return;

    const timeoutId = window.setTimeout(() => {
      setSearchParams(
        updateTicketFilters(searchParams, "search", trimmedSearch),
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search, searchParams, setSearchParams]);
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const today = formatLocalDate(new Date());
  const requestedStartDate = searchParams.get("startDate") ?? "";
  const requestedEndDate = searchParams.get("endDate") ?? "";
  const startDate =
    requestedStartDate && requestedStartDate > today
      ? today
      : requestedStartDate;
  const cappedEndDate =
    requestedEndDate && requestedEndDate > today ? today : requestedEndDate;
  const endDate =
    startDate && cappedEndDate && startDate > cappedEndDate
      ? startDate
      : cappedEndDate;
  const ticketFilters = new URLSearchParams(searchParams);
  if (startDate) ticketFilters.set("startDate", startDate);
  if (endDate) ticketFilters.set("endDate", endDate);
  const startDateMax = endDate && endDate < today ? endDate : today;
  const page = Number(searchParams.get("page") ?? "1");
  const filterString = ticketFilters.toString();
  const ticketsQuery = useTickets(organizationId!, filterString);
  const membersQuery = useMembers(organizationId!);
  const currentRole = membersQuery.data?.members.find(
    (member) => member.userId === user?.uid,
  )?.role;
  const deleteTicket = useDeleteTicket(organizationId!);
  const list = ticketsQuery.data?.tickets ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">SUPPORT QUEUE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tickets
          </h1>
          <p className="mt-2 text-sm text-muted">
            Find, prioritize and resolve customer requests.
          </p>
        </div>
        {hasPermission(currentRole, PERMISSIONS.CREATE_TICKET) && (
          <Link
            to="/app/tickets/new"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            New ticket
          </Link>
        )}
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <SlidersHorizontal size={15} />
          <span className="font-semibold text-ink">Filter tickets</span>
          <span>· Dates use ticket creation time</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <Input
              className="field !pl-10"
              placeholder="Search tickets…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Select
            className="field"
            aria-label="Status filter"
            value={status}
            onChange={(event) =>
              setSearchParams(
                updateTicketFilters(searchParams, "status", event.target.value),
              )
            }
          >
            <option value="">Any status</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Select
            className="field"
            aria-label="Priority filter"
            value={priority}
            onChange={(event) =>
              setSearchParams(
                updateTicketFilters(
                  searchParams,
                  "priority",
                  event.target.value,
                ),
              )
            }
          >
            <option value="">Any priority</option>
            {priorities.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Select
            className="field"
            aria-label="Assignee filter"
            value={assigneeId}
            onChange={(event) =>
              setSearchParams(
                updateTicketFilters(
                  searchParams,
                  "assigneeId",
                  event.target.value,
                ),
              )
            }
          >
            <option value="">Any assignee</option>
            {membersQuery.data?.members
              .filter((member) => member.status === "active")
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email || member.userId}
                </option>
              ))}
          </Select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:max-w-lg">
          <label>
            <Input
              type="date"
              aria-label="Created from date"
              max={startDateMax}
              value={startDate}
              onChange={(event) =>
                setSearchParams(
                  updateTicketDateFilter(
                    searchParams,
                    "startDate",
                    event.target.value,
                    today,
                  ),
                )
              }
            />
          </label>
          <label>
            <Input
              type="date"
              aria-label="Created through date"
              min={startDate || undefined}
              max={today}
              value={endDate}
              onChange={(event) =>
                setSearchParams(
                  updateTicketDateFilter(
                    searchParams,
                    "endDate",
                    event.target.value,
                    today,
                  ),
                )
              }
            />
          </label>
        </div>
        <button
          className="mt-3 text-xs font-semibold text-teal-700"
          onClick={() => {
            setSearch("");
            setSearchParams({});
          }}
        >
          Clear filters
        </button>
      </section>
      {ticketsQuery.isLoading ? (
        <LoadingState label="Loading tickets…" />
      ) : ticketsQuery.isError ? (
        <ErrorState
          message={ticketsQuery.error.message}
          retry={() => void ticketsQuery.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          title="No matching tickets"
          message="Try a different search or date range, or create a new ticket."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[860px] text-left">
              <TableHead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-muted">
                <TableRow>
                  <TableHeader className="px-5 py-3">
                    Ticket / customer
                  </TableHeader>
                  <TableHeader className="px-4 py-3">Status</TableHeader>
                  <TableHeader className="px-4 py-3">Priority</TableHeader>
                  <TableHeader className="px-4 py-3">Assigned to</TableHeader>
                  <TableHeader className="px-4 py-3">Created</TableHeader>
                  <TableHeader className="px-4 py-3">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y divide-slate-100">
                {list.map((ticket) => (
                  <TableRow key={ticket._id} className="hover:bg-slate-50/60">
                    <TableCell className="px-5 py-4">
                      <Link
                        to={`/app/tickets/${ticket._id}`}
                        className="font-semibold text-ink hover:text-teal-700"
                      >
                        {ticket.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {ticket.customerName} · {ticket.customerEmail}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <StatusPill status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <StatusPill status={ticket.priority} />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-xs text-muted">
                      {membersQuery.data?.members.find(
                        (member) => member.userId === ticket.assigneeId,
                      )?.email ??
                        (ticket.assigneeId ? ticket.assigneeId : "Unassigned")}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-xs text-muted">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/app/tickets/${ticket._id}`}
                          aria-label={`View ${ticket.title}`}
                          title="View ticket"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink transition hover:bg-teal-50 hover:text-teal-700"
                        >
                          <Eye size={15} />
                        </Link>
                        {(hasPermission(
                          currentRole,
                          PERMISSIONS.EDIT_ANY_TICKET,
                        ) ||
                          (hasPermission(
                            currentRole,
                            PERMISSIONS.EDIT_OWN_TICKET,
                          ) &&
                            (ticket.creatorId === user?.uid ||
                              ticket.assigneeId === user?.uid))) && (
                          <Link
                            to={`/app/tickets/${ticket._id}?edit=true`}
                            aria-label={`Edit ${ticket.title}`}
                            title="Edit ticket"
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink transition hover:bg-slate-100"
                          >
                            <Pencil size={14} />
                          </Link>
                        )}
                        {hasPermission(
                          currentRole,
                          PERMISSIONS.DELETE_TICKET,
                        ) && (
                          <button
                            type="button"
                            aria-label={`Delete ${ticket.title}`}
                            title="Delete ticket"
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            disabled={deleteTicket.isPending}
                            onClick={() => {
                              deleteTicket.reset();
                              setTicketToDelete(ticket);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-muted">
            <span>
              {ticketsQuery.data?.pagination.total ?? 0} tickets · Page {page}{" "}
              of {ticketsQuery.data?.pagination.pages ?? 1}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() =>
                  setSearchParams(
                    updateTicketFilters(searchParams, "page", String(page - 1)),
                  )
                }
              >
                <ArrowLeft size={15} />
              </button>
              <button
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                disabled={page >= (ticketsQuery.data?.pagination.pages ?? 1)}
                onClick={() =>
                  setSearchParams(
                    updateTicketFilters(searchParams, "page", String(page + 1)),
                  )
                }
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={ticketToDelete !== null}
        title="Delete this ticket?"
        description={
          ticketToDelete
            ? `“${ticketToDelete.title}” will be permanently deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete ticket"
        pendingLabel="Deleting…"
        pending={deleteTicket.isPending}
        error={deleteTicket.error?.message}
        onClose={() => {
          if (!deleteTicket.isPending) {
            setTicketToDelete(null);
            deleteTicket.reset();
          }
        }}
        onConfirm={() => {
          if (ticketToDelete)
            deleteTicket.mutate(ticketToDelete._id, {
              onSuccess: () => setTicketToDelete(null),
            });
        }}
      />
    </div>
  );
}
