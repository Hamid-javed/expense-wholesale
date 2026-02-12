"use server";

import mongoose from "mongoose";

const InvoiceCounterSchemaDef = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lastNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const InvoiceCounter =
  mongoose.models.InvoiceCounter ||
  mongoose.model("InvoiceCounter", InvoiceCounterSchemaDef);

