"use server";

import mongoose from "mongoose";

const ShopSchemaDef = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    phone: { type: String, trim: true },
    cnic: { type: String, trim: true },
    currentCredit: { type: Number, default: 0 },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Shop =
  mongoose.models.Shop || mongoose.model("Shop", ShopSchemaDef);

