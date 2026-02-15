"use server";

import mongoose from "mongoose";
import { PAYMENT_TYPES } from "../lib/config.js";

const SaleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchemaDef = new mongoose.Schema(
  {
    invoiceId: { type: Number, required: true, index: true },
    date: { type: Date, required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    items: [SaleItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentType: { type: String, enum: PAYMENT_TYPES, required: true },
    cashCollected: { type: Number, default: 0, min: 0 },
    creditRemaining: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Sale =
  mongoose.models.Sale || mongoose.model("Sale", SaleSchemaDef);

