"use server";

import mongoose from "mongoose";

const StaffSchemaDef = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    cnic: { type: String, trim: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    staffId: { type: String, unique: true, index: true }, // 6-digit generated
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Staff =
  mongoose.models.Staff || mongoose.model("Staff", StaffSchemaDef);

