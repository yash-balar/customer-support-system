import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { Membership } from "../models/Membership";
import { HttpError } from "../utils/errors";
import { can } from "../utils/permissions";

export async function requireMembership(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.params.organizationId;
    if (!mongoose.isValidObjectId(organizationId)) throw new HttpError(400, "Invalid organization ID.");
    const membership = await Membership.findOne({
      userId: req.user?.uid,
      organizationId,
      status: "active"
    }).lean();
    if (!membership) throw new HttpError(403, "Active organization membership required.");
    req.membership = {
      organizationId: membership.organizationId.toString(),
      role: membership.role,
      userId: membership.userId,
      status: membership.status
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission: import("../utils/permissions").Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const membership = req.membership;
    if (!membership || !can(membership.role, permission)) {
      next(new HttpError(403, "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}
