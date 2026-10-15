import { AuditLog } from "../models/AuditLog";
import type { Types } from "mongoose";

export async function writeAudit(
  actorId: string,
  organizationId: string | Types.ObjectId,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await AuditLog.create({ actorId, organizationId, action, targetType, targetId, metadata });
}
