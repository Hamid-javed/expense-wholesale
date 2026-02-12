"use server";

import mongoose from "mongoose";

const DailySalesSummarySchemaDef = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    cashSales: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    creditSales: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index to ensure one summary per staff per date
DailySalesSummarySchemaDef.index({ staffId: 1, date: 1 }, { unique: true });

export const DailySalesSummary =
  mongoose.models.DailySalesSummary ||
  mongoose.model("DailySalesSummary", DailySalesSummarySchemaDef);
