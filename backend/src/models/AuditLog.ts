import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: String, required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } },
);

export const AuditLog = model("AuditLog", auditLogSchema);
