import { Schema, model } from "mongoose";

export const roles = ["Owner", "Admin", "Manager", "Member", "Viewer"] as const;
export type Role = (typeof roles)[number];

const membershipSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    role: { type: String, enum: roles, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true }
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const Membership = model("Membership", membershipSchema);
