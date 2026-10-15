import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, LoadingState } from "../../components/States";
import { Field, Input, Select } from "../../components/common";
import { hasPermission, PERMISSIONS } from "../../constants/authorization";
import { StatusPill } from "../../components/common/StatusPill";
import { DetailItem } from "./DetailItem";
import { formSchema, priorities, statuses, type TicketFormValues } from "./shared";
import {
  useDeleteTicket,
  useTicket,
  useUpdateTicket,
} from "../../api/tickets/hook";
import { useMembers } from "../../api/team/hook";

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const { organizationId } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user } = useAuth();
  const ticketQuery = useTicket(organizationId!, ticketId!);
  const memberQuery = useMembers(organizationId!);
  const ticket = ticketQuery.data?.ticket;
  const currentMembership = memberQuery.data?.members.find(
    (member) => member.userId === user?.uid,
  );
  const canEditTicket =
    hasPermission(currentMembership?.role, PERMISSIONS.EDIT_ANY_TICKET) ||
    (hasPermission(currentMembership?.role, PERMISSIONS.EDIT_OWN_TICKET) &&
      (ticket?.creatorId === user?.uid || ticket?.assigneeId === user?.uid));
  const canAssignTicket = hasPermission(
    currentMembership?.role,
    PERMISSIONS.ASSIGN_TICKET,
  );
  const isEditing = canEditTicket && searchParams.get("edit") === "true";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    values: ticket
      ? {
          title: ticket.title,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          assigneeId: ticket.assigneeId,
        }
      : undefined,
  });
  const mutation = useUpdateTicket(organizationId!, ticketId!);
  const deleteTicket = useDeleteTicket(organizationId!, ticketId!);
  if (ticketQuery.isLoading) return <LoadingState />;
  if (ticketQuery.isError || !ticket)
    return (
      <ErrorState
        message={ticketQuery.error?.message ?? "Ticket not found."}
        retry={() => void ticketQuery.refetch()}
      />
    );
  return (
    <>
      <div className="mx-auto">
        <Link
          to="/app/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} />
          Back to tickets
        </Link>
        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
          <header className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                {isEditing ? "Edit support request" : "Ticket details"}
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {ticket.title}
              </h1>
              <p className="mt-2 text-sm text-muted">
                Customer: {ticket.customerName} · {ticket.customerEmail}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusPill status={ticket.status} />
              <StatusPill status={ticket.priority} />
            </div>
          </header>
          <div className="p-5 sm:p-8">
            {isEditing ? (
              <form
                className="grid gap-5 sm:grid-cols-2"
                onSubmit={handleSubmit((values) => {
                  const { assigneeId, ...ticketUpdates } = values;
                  const updates = canAssignTicket
                    ? { ...ticketUpdates, assigneeId }
                    : ticketUpdates;
                  mutation.mutate(updates, {
                    onSuccess: () => navigate("/app/tickets"),
                  });
                })}
              >
                <Field
                  label="Subject"
                  error={errors.title?.message}
                  className="sm:col-span-2"
                >
                  <Input {...register("title")} />
                </Field>
                <Field
                  label="Customer name"
                  error={errors.customerName?.message}
                >
                  <Input {...register("customerName")} />
                </Field>
                <Field
                  label="Customer email"
                  error={errors.customerEmail?.message}
                >
                  <Input
                    type="email"
                    {...register("customerEmail")}
                  />
                </Field>
                <Field label="Status">
                  <Select {...register("status")}>
                    {statuses.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select {...register("priority")}>
                    {priorities.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                </Field>
                {canAssignTicket && (
                  <Field label="Assigned to">
                    <Select {...register("assigneeId")}>
                      <option value="">Unassigned</option>
                      {memberQuery.data?.members
                        .filter((member) => member.status === "active")
                        .map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.email || member.userId}
                          </option>
                        ))}
                    </Select>
                  </Field>
                )}
                <Field
                  label="Description"
                  error={errors.description?.message}
                  className="sm:col-span-2"
                >
                  <textarea
                    className="field min-h-36 resize-y"
                    {...register("description")}
                  />
                </Field>
                {mutation.isError && (
                  <p
                    role="alert"
                    className="text-sm text-rose-600 sm:col-span-2"
                  >
                    {mutation.error.message}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary w-full sm:w-auto"
                    disabled={mutation.isPending}
                    onClick={() => setSearchParams({})}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="btn-primary w-full sm:w-auto"
                  >
                    {mutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Status">
                    <StatusPill status={ticket.status} />
                  </DetailItem>
                  <DetailItem label="Priority">
                    <StatusPill status={ticket.priority} />
                  </DetailItem>
                  <DetailItem label="Assigned to">
                    {memberQuery.data?.members.find(
                      (member) => member.userId === ticket.assigneeId,
                    )?.email ??
                      ticket.assigneeId ??
                      "Unassigned"}
                  </DetailItem>
                  <DetailItem label="Created by">{ticket.creatorId}</DetailItem>
                  <DetailItem label="Created">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </DetailItem>
                  <DetailItem label="Last updated">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </DetailItem>
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Description
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-ink sm:p-5">
                    {ticket.description}
                  </p>
                </div>
                {hasPermission(
                  currentMembership?.role,
                  PERMISSIONS.EDIT_OWN_TICKET,
                ) &&
                  !canEditTicket && (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-muted">
                    You can edit this ticket only if you created it or it is
                    assigned to you.
                  </p>
                )}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  {["Owner", "Admin", "Manager"].includes(
                    currentMembership?.role ?? "",
                  ) && (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:mr-auto sm:w-auto"
                      onClick={() => {
                        deleteTicket.reset();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete ticket
                    </button>
                  )}
                  {canEditTicket && (
                    <button
                      type="button"
                      className="btn-primary w-full sm:w-auto"
                      onClick={() => setSearchParams({ edit: "true" })}
                    >
                      Edit ticket
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete this ticket?"
        description={`“${ticket.title}” will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete ticket"
        pendingLabel="Deleting…"
        pending={deleteTicket.isPending}
        error={deleteTicket.error?.message}
        onClose={() => {
          if (!deleteTicket.isPending) {
            setDeleteDialogOpen(false);
            deleteTicket.reset();
          }
        }}
        onConfirm={() =>
          deleteTicket.mutate(undefined, {
            onSuccess: () => navigate("/app/tickets"),
          })
        }
      />
    </>
  );
}
