import { z } from "zod";
import type { Priority, TicketStatus } from "../../types";

export const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
export const statuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];
export const formSchema = z.object({
  title: z.string().trim().min(2, "Add a short subject.").max(160),
  customerName: z.string().trim().min(1, "Enter the customer name.").max(120),
  customerEmail: z.string().email("Enter a valid email."),
  description: z.string().trim().min(1, "Add a description.").max(10000),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]),
  assigneeId: z
    .string()
    .transform((value) => value || null)
    .nullable()
    .optional(),
});
export type TicketFormValues = z.infer<typeof formSchema>;
