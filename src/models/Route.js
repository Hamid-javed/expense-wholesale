"use server";

import mongoose from "mongoose";

const RouteSchemaDef = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    // Shops are linked from Shop.routeId; we keep this field for quick reverse lookups if needed
    shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const RouteModel =
  mongoose.models.Route || mongoose.model("Route", RouteSchemaDef);

