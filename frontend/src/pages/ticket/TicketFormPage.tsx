import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { Button, Field, Input, Select } from "../../components/common";
import { formSchema, priorities, statuses, type TicketFormValues } from "./shared";
import { useCreateTicket } from "../../api/tickets/hook";

export function TicketFormPage() {
  const { organizationId } = useWorkspace();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      customerName: "",
      customerEmail: "",
      description: "",
      priority: "Medium",
      status: "Open",
    },
  });
  const mutation = useCreateTicket(organizationId!);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={16} />
        Back to tickets
      </Link>
      <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-semibold text-teal-700">
          NEW CUSTOMER REQUEST
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Create a ticket</h1>
        <p className="mt-2 text-sm text-muted">
          Capture the details so your team can take it from here.
        </p>{" "}
        <form
          className="mt-7 grid gap-5 sm:grid-cols-2"
          onSubmit={handleSubmit((values) =>
            mutation.mutate(values, {
              onSuccess: ({ ticket }) => navigate(`/app/tickets/${ticket._id}`),
            }),
          )}
        >
          <Field
            label="Subject"
            error={errors.title?.message}
            className="sm:col-span-2"
          >
            <Input
              placeholder="What does the customer need help with?"
              {...register("title")}
            />
          </Field>
          <Field label="Customer name" error={errors.customerName?.message}>
            <Input {...register("customerName")} />
          </Field>
          <Field label="Customer email" error={errors.customerEmail?.message}>
            <Input
              type="email"
              {...register("customerEmail")}
            />
          </Field>
          <Field label="Priority" error={errors.priority?.message}>
            <Select {...register("priority")}>
              {priorities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Description"
            error={errors.description?.message}
            className="sm:col-span-2"
          >
            <textarea
              className="field min-h-32 resize-y"
              placeholder="Add useful context for the support team…"
              {...register("description")}
            />
          </Field>
          {mutation.isError && (
            <p role="alert" className="text-sm text-rose-600 sm:col-span-2">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/app/tickets")}
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || mutation.isPending}
            >
              {mutation.isPending ? "Creating…" : "Create ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
