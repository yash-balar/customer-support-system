import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Organization } from "../models/Organization";
import { Membership } from "../models/Membership";
import { Invitation } from "../models/Invitation";
import { requireMembership, requirePermission } from "../middleware/organization";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { writeAudit } from "../services/audit";
import { revokeOrganizationRoom } from "../sockets";
import type { Server } from "socket.io";

export const organizationRouter = Router();

organizationRouter.get("/", asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ userId: req.user!.uid, status: "active" }).lean();
  const organizations = await Organization.find({ _id: { $in: memberships.map((item) => item.organizationId) } }).lean();
  res.json({ organizations: organizations.map((organization) => ({
    ...organization,
    role: memberships.find((item) => item.organizationId.equals(organization._id))?.role
  })) });
}));

organizationRouter.post("/", asyncHandler(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body);
  if (req.user!.email) {
    const pendingInvitation = await Invitation.exists({
      email: req.user!.email.toLowerCase(),
      status: "pending"
    });
    if (pendingInvitation) {
      throw new HttpError(409, "Accept your pending organization invitation before creating a workspace.");
    }
  }
  const organization = await Organization.create({
    name: input.name,
    createdBy: req.user!.uid,
    activeOwnerCount: 1
  });
  await Membership.create({
    userId: req.user!.uid,
    email: req.user!.email ?? "",
    organizationId: organization._id,
    role: "Owner"
  });
  res.status(201).json({ organization });
}));

organizationRouter.get("/:organizationId/members", requireMembership, asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ organizationId: req.membership!.organizationId }).select("-__v").lean();
  res.json({ members: memberships });
}));

organizationRouter.patch("/:organizationId/members/:memberId", requireMembership, requirePermission("members:manage"), asyncHandler(async (req, res) => {
  const input = z.object({ role: z.enum(["Owner", "Admin", "Manager", "Member", "Viewer"]).optional(), status: z.enum(["active", "inactive"]).optional() })
    .refine((value) => value.role !== undefined || value.status !== undefined).parse(req.body);
  if (!mongoose.isValidObjectId(req.params.memberId)) throw new HttpError(400, "Invalid membership ID.");
  const target = await Membership.findOne({ _id: req.params.memberId, organizationId: req.membership!.organizationId });
  if (!target) throw new HttpError(404, "Membership not found.");
  if (target.userId === req.user!.uid) throw new HttpError(403, "You cannot change your own membership.");
  const actorRole = req.membership!.role;
  if (actorRole === "Admin" && (target.role === "Owner" || input.role === "Owner")) {
    throw new HttpError(403, "Admins cannot change or grant the Owner role.");
  }
  if (input.role === "Owner" && actorRole !== "Owner") throw new HttpError(403, "Only an Owner can transfer ownership.");
  const wasActiveOwner = target.role === "Owner" && target.status === "active";
  const nextRole = input.role ?? target.role;
  const nextStatus = input.status ?? target.status;
  const willBeActiveOwner = nextRole === "Owner" && nextStatus === "active";
  if (wasActiveOwner && !willBeActiveOwner) {
    const updatedOrganization = await Organization.findOneAndUpdate(
      { _id: req.membership!.organizationId, activeOwnerCount: { $gt: 1 } },
      { $inc: { activeOwnerCount: -1 } },
      { new: true }
    );
    if (!updatedOrganization) throw new HttpError(409, "The organization must retain at least one active Owner.");
  }
  if (!wasActiveOwner && willBeActiveOwner) {
    await Organization.updateOne({ _id: req.membership!.organizationId }, { $inc: { activeOwnerCount: 1 } });
  }
  const before = { role: target.role, status: target.status };
  if (input.role) target.role = input.role;
  if (input.status) target.status = input.status;
  await target.save();
  if (target.status === "inactive") {
    const io = req.app.get("io") as Server | undefined;
    if (io) revokeOrganizationRoom(io, target.userId, req.membership!.organizationId);
  }
  await writeAudit(req.user!.uid, req.membership!.organizationId, "member.updated", "Membership", String(target._id), { before, after: { role: target.role, status: target.status } });
  res.json({ member: target });
}));

organizationRouter.delete("/:organizationId/members/:memberId", requireMembership, requirePermission("members:manage"), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.memberId)) throw new HttpError(400, "Invalid membership ID.");
  const target = await Membership.findOne({ _id: req.params.memberId, organizationId: req.membership!.organizationId, status: "active" });
  if (!target) throw new HttpError(404, "Membership not found.");
  if (target.userId === req.user!.uid && target.role === "Owner") {
    const organization = await Organization.findById(req.membership!.organizationId).select("activeOwnerCount").lean();
    if (organization && organization.activeOwnerCount <= 1) {
      throw new HttpError(409, "The organization must retain at least one active Owner.");
    }
  }
  if (target.userId === req.user!.uid) throw new HttpError(403, "You cannot remove yourself.");
  if (req.membership!.role === "Admin" && target.role === "Owner") {
    throw new HttpError(403, "Admins cannot remove an Owner.");
  }
  if (target.role === "Owner") {
    const updatedOrganization = await Organization.findOneAndUpdate(
      { _id: req.membership!.organizationId, activeOwnerCount: { $gt: 1 } },
      { $inc: { activeOwnerCount: -1 } }
    );
    if (!updatedOrganization) throw new HttpError(409, "The organization must retain at least one active Owner.");
  }
  target.status = "inactive";
  await target.save();
  const io = req.app.get("io") as Server | undefined;
  if (io) revokeOrganizationRoom(io, target.userId, req.membership!.organizationId);
  await writeAudit(req.user!.uid, req.membership!.organizationId, "member.removed", "Membership", String(target._id), { role: target.role });
  res.status(204).end();
}));

organizationRouter.patch("/:organizationId/settings", requireMembership, requirePermission("settings:manage"), asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    supportEmail: z.string().email().or(z.literal("")).optional(),
    timezone: z.string().min(1).max(80).optional()
  }).parse(req.body);
  const organization = await Organization.findById(req.membership!.organizationId);
  if (!organization) throw new HttpError(404, "Organization not found.");
  const before = { name: organization.name, settings: organization.get("settings") };
  if (input.name) organization.name = input.name;
  if (input.supportEmail !== undefined) organization.set("settings.supportEmail", input.supportEmail);
  if (input.timezone) organization.set("settings.timezone", input.timezone);
  await organization.save();
  await writeAudit(req.user!.uid, organization._id, "organization.settings_updated", "Organization", String(organization._id), { before, after: { name: organization.name, settings: organization.get("settings") } });
  res.json({ organization });
}));

organizationRouter.use("/:organizationId", requireMembership);

organizationRouter.get("/:organizationId/audit-logs", requirePermission("audit:read"), asyncHandler(async (req, res) => {
  const { AuditLog } = await import("../models/AuditLog");
  const entries = await AuditLog.find({ organizationId: req.membership!.organizationId }).sort({ timestamp: -1 }).limit(100).lean();
  res.json({ entries });
}));
