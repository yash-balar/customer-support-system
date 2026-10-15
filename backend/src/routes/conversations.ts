import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { Membership } from "../models/Membership";
import {
  requireMembership,
  requirePermission,
} from "../middleware/organization";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { canEditTicket } from "../utils/permissions";
import { writeAudit } from "../services/audit";

export const conversationRouter = Router({ mergeParams: true });
conversationRouter.use(requireMembership);

conversationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
      organizationId: req.membership!.organizationId,
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    res.json({ conversations });
  }),
);

conversationRouter.post(
  "/",
  requirePermission("tickets:create"),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        subject: z.string().trim().min(2).max(160),
        customerName: z.string().trim().min(1).max(120),
        customerEmail: z.string().email(),
      })
      .parse(req.body);
    const conversation = await Conversation.create({
      ...input,
      organizationId: req.membership!.organizationId,
      creatorId: req.user!.uid,
    });
    await writeAudit(
      req.user!.uid,
      req.membership!.organizationId,
      "conversation.created",
      "Conversation",
      String(conversation._id),
      { subject: conversation.subject },
    );
    req.app
      .get("io")
      ?.to(`org:${req.membership!.organizationId}`)
      .emit("conversation:updated", conversation);
    res.status(201).json({ conversation });
  }),
);

conversationRouter.patch(
  "/:conversationId",
  requirePermission("tickets:update"),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId))
      throw new HttpError(400, "Invalid conversation ID.");
    const input = z
      .object({
        subject: z.string().trim().min(2).max(160).optional(),
        status: z
          .enum(["Open", "In Progress", "Resolved", "Closed"])
          .optional(),
        assigneeId: z.string().nullable().optional(),
      })
      .refine((value) => Object.keys(value).length > 0)
      .parse(req.body);
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      organizationId: req.membership!.organizationId,
    });
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    if (
      !canEditTicket(
        req.membership!.role,
        req.user!.uid,
        conversation.assigneeId,
        conversation.creatorId,
      )
    )
      throw new HttpError(
        403,
        "You may only update conversations assigned to or created by you.",
      );
    if (input.assigneeId !== undefined) {
      if (!["Owner", "Admin", "Manager"].includes(req.membership!.role))
        throw new HttpError(403, "You cannot assign conversations.");
      if (input.assigneeId !== null) {
        const assignee = await Membership.findOne({
          userId: input.assigneeId,
          organizationId: req.membership!.organizationId,
          status: "active",
        });
        if (!assignee)
          throw new HttpError(
            400,
            "Assignee must be an active organization member.",
          );
      }
    }
    const before = {
      status: conversation.status,
      assigneeId: conversation.assigneeId,
      subject: conversation.subject,
    };
    if (input.subject !== undefined) conversation.subject = input.subject;
    if (input.status !== undefined) conversation.status = input.status;
    if (input.assigneeId !== undefined)
      conversation.assigneeId = input.assigneeId;
    await conversation.save();
    await writeAudit(
      req.user!.uid,
      req.membership!.organizationId,
      input.assigneeId !== undefined
        ? "conversation.reassigned"
        : "conversation.updated",
      "Conversation",
      String(conversation._id),
      {
        before,
        after: {
          status: conversation.status,
          assigneeId: conversation.assigneeId,
          subject: conversation.subject,
        },
      },
    );
    req.app
      .get("io")
      ?.to(`org:${req.membership!.organizationId}`)
      .emit("conversation:updated", conversation);
    res.json({ conversation });
  }),
);

conversationRouter.get(
  "/:conversationId/messages",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId))
      throw new HttpError(400, "Invalid conversation ID.");
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      organizationId: req.membership!.organizationId,
    }).select("_id");
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    const messages = await Message.find({
      conversationId: conversation._id,
      organizationId: req.membership!.organizationId,
    })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ messages });
  }),
);

conversationRouter.post(
  "/:conversationId/messages",
  requirePermission("tickets:create"),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId))
      throw new HttpError(400, "Invalid conversation ID.");
    const input = z
      .object({ body: z.string().trim().min(1).max(5000) })
      .parse(req.body);
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      organizationId: req.membership!.organizationId,
    });
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    if (
      req.membership!.role === "Member" &&
      !canEditTicket(
        req.membership!.role,
        req.user!.uid,
        conversation.assigneeId,
        conversation.creatorId,
      )
    ) {
      throw new HttpError(
        403,
        "You may only reply to conversations assigned to or created by you.",
      );
    }
    const message = await Message.create({
      body: input.body,
      conversationId: conversation._id,
      organizationId: req.membership!.organizationId,
      senderId: req.user!.uid,
    });
    conversation.updatedAt = new Date();
    await conversation.save();
    req.app
      .get("io")
      ?.to(`org:${req.membership!.organizationId}`)
      .emit("message:created", message);
    res.status(201).json({ message });
  }),
);

conversationRouter.delete(
  "/:conversationId",
  requirePermission("tickets:delete"),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId))
      throw new HttpError(400, "Invalid conversation ID.");
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.conversationId,
      organizationId: req.membership!.organizationId,
    });
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    await Message.deleteMany({
      conversationId: conversation._id,
      organizationId: req.membership!.organizationId,
    });
    await writeAudit(
      req.user!.uid,
      req.membership!.organizationId,
      "conversation.deleted",
      "Conversation",
      String(conversation._id),
      { subject: conversation.subject },
    );
    req.app
      .get("io")
      ?.to(`org:${req.membership!.organizationId}`)
      .emit("conversation:deleted", { id: String(conversation._id) });
    res.status(204).end();
  }),
);
