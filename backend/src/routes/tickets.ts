import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Ticket } from "../models/Ticket";
import { Membership } from "../models/Membership";
import { requireMembership, requirePermission } from "../middleware/organization";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { canEditTicket } from "../utils/permissions";
import { writeAudit } from "../services/audit";

export const ticketRouter = Router({ mergeParams: true });
ticketRouter.use(requireMembership);

const ticketInput = z.object({
  title: z.string().trim().min(2).max(160),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().email(),
  description: z.string().trim().min(1).max(10000),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  assigneeId: z.string().nullable().optional()
});

const ticketUpdate = ticketInput.partial().refine((value) => Object.keys(value).length > 0);

function isValidDateOnly(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

ticketRouter.get("/", asyncHandler(async (req, res) => {
  const querySchema = z.object({
    status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
    assigneeId: z.string().optional(),
    search: z.string().trim().max(120).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }).parse(req.query);
  const { startDate, endDate } = querySchema;
  if (startDate && !isValidDateOnly(startDate)) throw new HttpError(400, "Invalid start date.");
  if (endDate && !isValidDateOnly(endDate)) throw new HttpError(400, "Invalid end date.");
  if (startDate && endDate && startDate > endDate) throw new HttpError(400, "Start date must be on or before end date.");
  const filter: Record<string, unknown> = { organizationId: req.membership!.organizationId };
  if (querySchema.status) filter.status = querySchema.status;
  if (querySchema.priority) filter.priority = querySchema.priority;
  if (querySchema.assigneeId) filter.assigneeId = querySchema.assigneeId;
  if (querySchema.search) {
    const escaped = querySchema.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { customerName: { $regex: escaped, $options: "i" } },
      { customerEmail: { $regex: escaped, $options: "i" } }
    ];
  }
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const exclusiveEnd = new Date(`${endDate}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      createdAt.$lt = exclusiveEnd;
    }
    filter.createdAt = createdAt;
  }
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip((querySchema.page - 1) * querySchema.limit).limit(querySchema.limit).lean(),
    Ticket.countDocuments(filter)
  ]);
  res.json({ tickets, pagination: { page: querySchema.page, limit: querySchema.limit, total, pages: Math.ceil(total / querySchema.limit) } });
}));

ticketRouter.post("/", requirePermission("tickets:create"), asyncHandler(async (req, res) => {
  const input = ticketInput.parse(req.body);
  if (input.assigneeId) {
    if (!["Owner", "Admin", "Manager"].includes(req.membership!.role)) throw new HttpError(403, "You cannot assign tickets.");
    const assignee = await Membership.findOne({ userId: input.assigneeId, organizationId: req.membership!.organizationId, status: "active" });
    if (!assignee) throw new HttpError(400, "Assignee must be an active organization member.");
  }
  const ticket = await Ticket.create({
    title: input.title,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    description: input.description,
    status: input.status ?? "Open",
    priority: input.priority ?? "Medium",
    assigneeId: input.assigneeId ?? null,
    organizationId: req.membership!.organizationId,
    creatorId: req.user!.uid
  });
  await writeAudit(req.user!.uid, req.membership!.organizationId, "ticket.created", "Ticket", String(ticket._id), { title: ticket.title });
  req.app.get("io")?.to(`org:${req.membership!.organizationId}`).emit("ticket:created", ticket);
  res.status(201).json({ ticket });
}));

ticketRouter.get("/:ticketId", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.ticketId)) throw new HttpError(400, "Invalid ticket ID.");
  const ticket = await Ticket.findOne({ _id: req.params.ticketId, organizationId: req.membership!.organizationId }).lean();
  if (!ticket) throw new HttpError(404, "Ticket not found.");
  res.json({ ticket });
}));

ticketRouter.patch("/:ticketId", requirePermission("tickets:update"), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.ticketId)) throw new HttpError(400, "Invalid ticket ID.");
  const input = ticketUpdate.parse(req.body);
  const ticket = await Ticket.findOne({ _id: req.params.ticketId, organizationId: req.membership!.organizationId });
  if (!ticket) throw new HttpError(404, "Ticket not found.");
  if (!canEditTicket(req.membership!.role, req.user!.uid, ticket.assigneeId, ticket.creatorId)) throw new HttpError(403, "You may only update tickets assigned to or created by you.");
  if (input.assigneeId !== undefined) {
    if (!["Owner", "Admin", "Manager"].includes(req.membership!.role)) throw new HttpError(403, "You cannot assign tickets.");
    if (input.assigneeId !== null) {
      const assignee = await Membership.findOne({ userId: input.assigneeId, organizationId: req.membership!.organizationId, status: "active" });
      if (!assignee) throw new HttpError(400, "Assignee must be an active organization member.");
    }
  }
  const before = { status: ticket.status, priority: ticket.priority, assigneeId: ticket.assigneeId, title: ticket.title };
  if (input.title !== undefined) ticket.title = input.title;
  if (input.customerName !== undefined) ticket.customerName = input.customerName;
  if (input.customerEmail !== undefined) ticket.customerEmail = input.customerEmail;
  if (input.description !== undefined) ticket.description = input.description;
  if (input.status !== undefined) ticket.status = input.status;
  if (input.priority !== undefined) ticket.priority = input.priority;
  if (input.assigneeId !== undefined) ticket.assigneeId = input.assigneeId;
  await ticket.save();
  await writeAudit(req.user!.uid, req.membership!.organizationId, input.assigneeId !== undefined ? "ticket.reassigned" : "ticket.updated", "Ticket", String(ticket._id), { before, after: { status: ticket.status, priority: ticket.priority, assigneeId: ticket.assigneeId, title: ticket.title } });
  req.app.get("io")?.to(`org:${req.membership!.organizationId}`).emit("ticket:updated", ticket);
  res.json({ ticket });
}));

ticketRouter.delete("/:ticketId", requirePermission("tickets:delete"), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.ticketId)) throw new HttpError(400, "Invalid ticket ID.");
  const ticket = await Ticket.findOneAndDelete({ _id: req.params.ticketId, organizationId: req.membership!.organizationId });
  if (!ticket) throw new HttpError(404, "Ticket not found.");
  await writeAudit(req.user!.uid, req.membership!.organizationId, "ticket.deleted", "Ticket", String(ticket._id), { title: ticket.title });
  req.app.get("io")?.to(`org:${req.membership!.organizationId}`).emit("ticket:deleted", { id: String(ticket._id) });
  res.status(204).end();
}));
