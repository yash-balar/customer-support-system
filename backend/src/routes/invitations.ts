import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Invitation } from "../models/Invitation";
import { Membership } from "../models/Membership";
import {
  requireMembership,
  requirePermission,
} from "../middleware/organization";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { writeAudit } from "../services/audit";

export const organizationInvitationRouter = Router({ mergeParams: true });
organizationInvitationRouter.use(
  requireMembership,
  requirePermission("members:manage"),
);

function invitationEmailPattern(email: string): RegExp {
  const escapedEmail = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedEmail}$`, "i");
}

organizationInvitationRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .email()
          .transform((email) => email.toLowerCase()),
        role: z.enum(["Admin", "Manager", "Member", "Viewer"]),
      })
      .parse(req.body);
    const existingMember = await Membership.findOne({
      organizationId: req.membership!.organizationId,
      email: input.email,
      status: "active",
    });
    if (existingMember)
      throw new HttpError(
        409,
        "This person is already an active organization member.",
      );
    const existingInvitation = await Invitation.findOne({
      organizationId: req.membership!.organizationId,
      email: input.email,
      status: "pending",
    });
    if (existingInvitation) {
      throw new HttpError(
        409,
        "An invitation is already pending for this email in this organization.",
      );
    }
    const invitation = await Invitation.create({
      ...input,
      organizationId: req.membership!.organizationId,
      invitedBy: req.user!.uid,
    });
    await writeAudit(
      req.user!.uid,
      req.membership!.organizationId,
      "member.invited",
      "Invitation",
      String(invitation._id),
      { email: input.email, role: input.role },
    );
    res.status(201).json({ invitation });
  }),
);

export const invitationRouter = Router();
invitationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const email = user.email?.trim();
    if (!email) {
      res.json({ invitations: [] });
      return;
    }
    const invitations = await Invitation.find({
      email: invitationEmailPattern(email),
      status: "pending",
    })
      .populate("organizationId", "name")
      .lean();
    res.json({ invitations });
  }),
);

invitationRouter.post(
  "/:invitationId/accept",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!user.email)
      throw new HttpError(
        400,
        "A valid account email is required to accept invitations.",
      );
    const authenticatedEmail = user.email.trim().toLowerCase();
    const emailPattern = invitationEmailPattern(authenticatedEmail);
    if (req.body?.email !== undefined) {
      const confirmation = z
        .object({ email: z.string().email() })
        .parse(req.body);
      if (confirmation.email.trim().toLowerCase() !== authenticatedEmail) {
        throw new HttpError(
          403,
          "The invitation email must match the signed-in account.",
        );
      }
    }
    if (!mongoose.isValidObjectId(req.params.invitationId))
      throw new HttpError(400, "Invalid invitation ID.");
    const pendingInvitation = await Invitation.findOne({
      _id: req.params.invitationId,
      email: emailPattern,
      status: "pending",
    });
    if (!pendingInvitation) {
      const previouslyAccepted = await Invitation.exists({
        _id: req.params.invitationId,
        email: emailPattern,
        status: "accepted",
      });
      if (previouslyAccepted)
        throw new HttpError(409, "This invitation has already been accepted.");
      throw new HttpError(
        404,
        "This pending invitation was not found for the signed-in email address.",
      );
    }

    const existingMembership = await Membership.exists({
      userId: user.uid,
      organizationId: pendingInvitation.organizationId,
    });
    if (existingMembership)
      throw new HttpError(
        409,
        "You are already a member of this organization.",
      );

    const invitation = await Invitation.findOneAndUpdate(
      { _id: pendingInvitation._id, email: emailPattern, status: "pending" },
      { $set: { status: "accepted" } },
      { new: true },
    );
    if (!invitation)
      throw new HttpError(409, "This invitation is no longer pending.");

    let membership;
    try {
      membership = await Membership.create({
        userId: user.uid,
        email: authenticatedEmail,
        organizationId: invitation.organizationId,
        role: invitation.role,
        status: "active",
      });
    } catch (error) {
      await Invitation.updateOne(
        { _id: invitation._id, status: "accepted" },
        { $set: { status: "pending" } },
      );
      if (error instanceof Error && "code" in error && error.code === 11000) {
        throw new HttpError(
          409,
          "You are already a member of this organization.",
        );
      }
      throw error;
    }

    await writeAudit(
      user.uid,
      invitation.organizationId,
      "member.invitation_accepted",
      "Membership",
      String(membership._id),
      { role: membership.role },
    );
    res.status(201).json({ membership });
  }),
);
