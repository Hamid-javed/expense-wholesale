"use server";

import mongoose from "mongoose";

const CreditPaymentSchemaDef = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const CreditPayment =
  mongoose.models.CreditPayment ||
  mongoose.model("CreditPayment", CreditPaymentSchemaDef);

