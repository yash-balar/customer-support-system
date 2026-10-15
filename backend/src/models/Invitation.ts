import { Schema, model } from "mongoose";
import { roles } from "./Membership";

const invitationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: roles.filter((role) => role !== "Owner"), required: true },
    invitedBy: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted"], default: "pending", required: true }
  },
  { timestamps: true }
);

invitationSchema.index(
  { organizationId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const Invitation = model("Invitation", invitationSchema);
