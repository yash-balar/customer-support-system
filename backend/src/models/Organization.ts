import { Schema, model } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    createdBy: { type: String, required: true, index: true },
    activeOwnerCount: { type: Number, required: true, min: 1, default: 1 },
    settings: {
      supportEmail: { type: String, trim: true, default: "" },
      timezone: { type: String, default: "UTC" },
    },
  },
  { timestamps: true },
);

export const Organization = model("Organization", organizationSchema);
