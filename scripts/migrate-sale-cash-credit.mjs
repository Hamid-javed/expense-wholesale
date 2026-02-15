/**
 * One-time migration: backfill cashCollected and creditRemaining on existing Sale documents
 * from paymentType and totalAmount (cash -> full amount as cashCollected; credit -> full amount as creditRemaining).
 * Run with: node scripts/migrate-sale-cash-credit.mjs
 */
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/db.js";
import { Sale } from "../src/models/Sale.js";

async function main() {
  await connectToDatabase();

  const sales = await Sale.find({
    $or: [
      { cashCollected: { $exists: false } },
      { creditRemaining: { $exists: false } },
      { $and: [{ cashCollected: 0 }, { creditRemaining: 0 }] },
    ],
    deletedAt: null,
  }).lean();

  let updated = 0;
  for (const sale of sales) {
    const total = sale.totalAmount ?? 0;
    const cashCollected = sale.paymentType === "cash" ? total : 0;
    const creditRemaining = sale.paymentType === "credit" ? total : 0;
    if (
      (sale.cashCollected ?? 0) === 0 &&
      (sale.creditRemaining ?? 0) === 0 &&
      total > 0
    ) {
      await Sale.updateOne(
        { _id: sale._id },
        { $set: { cashCollected, creditRemaining } }
      );
      updated += 1;
    }
  }

  console.log(`Migration complete. Updated ${updated} of ${sales.length} sales.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
