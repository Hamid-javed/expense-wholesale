"use server";

import mongoose from "mongoose";

const ReturnSchemaDef = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ReturnModel =
  mongoose.models.Return || mongoose.model("Return", ReturnSchemaDef);

