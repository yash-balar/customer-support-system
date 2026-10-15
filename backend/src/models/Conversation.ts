import { Schema, model } from "mongoose";

const conversationSchema = new Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ["Open", "In Progress", "Resolved", "Closed"], default: "Open" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    assigneeId: { type: String, default: null },
    creatorId: { type: String, required: true }
  },
  { timestamps: true }
);

export const Conversation = model("Conversation", conversationSchema);
