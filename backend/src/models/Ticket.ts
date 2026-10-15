import { Schema, model } from "mongoose";

const ticketSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    assigneeId: { type: String, default: null },
    creatorId: { type: String, required: true },
  },
  { timestamps: true },
);

ticketSchema.index({ organizationId: 1, createdAt: -1 });

export const Ticket = model("Ticket", ticketSchema);
