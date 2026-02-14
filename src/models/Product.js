"use server";

import mongoose from "mongoose";
import { UNITS } from "../lib/config.js";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, enum: UNITS, default: "pcs" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 }, // Current stock on hand
    isActive: { type: Boolean, default: true },
    // Aggregated fields (denormalized for fast dashboard/reporting)
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

