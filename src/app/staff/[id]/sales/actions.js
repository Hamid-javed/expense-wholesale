"use server";

import { connectToDatabase } from "../../../../lib/db";
import { DailySalesSummary } from "../../../../models/DailySalesSummary";
import { Sale } from "../../../../models/Sale";
import { Product } from "../../../../models/Product";
import { Shop } from "../../../../models/Shop";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStartOfDayPK, getEndOfDayPK } from "../../../../lib/dateUtils";

const dailySummarySchema = z.object({
  staffId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  cashSales: z.coerce.number().min(0).default(0),
  creditSales: z.coerce.number().min(0).default(0),
});

export async function upsertDailySalesSummary(formData) {
  try {
    await connectToDatabase();

    const rawData = {
      staffId: formData.get("staffId")?.toString().trim(),
      date: formData.get("date")?.toString().trim(),
      cashSales: formData.get("cashSales")?.toString().trim() || "0",
      creditSales: formData.get("creditSales")?.toString().trim() || "0",
    };

    const validated = dailySummarySchema.parse(rawData);

    // Parse date string (YYYY-MM-DD) and create Date range in PK timezone
    const startOfDay = getStartOfDayPK(validated.date);
    const endOfDay = getEndOfDayPK(validated.date);

    // Calculate total sales amount for this staff/date
    // Credit here means loans/credit given to shopkeepers, not credit sales
    // So we need to ensure cashSales + creditSales doesn't exceed total sales
    const sales = await Sale.find({
      staffId: validated.staffId,
      deletedAt: null,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Total sales amount (sum of all sales regardless of paymentType)
    const totalSalesAmount = sales.reduce(
      (sum, s) => sum + (s.totalAmount || 0),
      0
    );

    // Round to 2 decimals to avoid floating-point comparison issues
    const round2 = (n) => Math.round(Number(n) * 100) / 100;
    const cashEntered = round2(validated.cashSales);
    const creditEntered = round2(validated.creditSales);
    const totalEntered = round2(cashEntered + creditEntered);
    const totalActual = round2(totalSalesAmount);

    // Validate: cash + credit (loan) cannot exceed total sales amount
    if (totalEntered > totalActual) {
      return {
        success: false,
        error: `Daily cash + credit (loan) cannot exceed total sales amount (total sales: ${totalActual}).`,
      };
    }

    // Upsert: find or create, then update
    const summary = await DailySalesSummary.findOneAndUpdate(
      {
        staffId: validated.staffId,
        date: startOfDay,
        deletedAt: null,
      },
      {
        staffId: validated.staffId,
        date: startOfDay,
        cashSales: validated.cashSales,
        creditSales: validated.creditSales,
        isActive: true,
        deletedAt: null,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Revalidate the staff sales page
    revalidatePath(`/staff/${validated.staffId}/sales`);

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error upserting daily sales summary:", error);
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
          : error.message || "Failed to save daily sales summary",
    };
  }
}

const updateSaleItemSchema = z.object({
  saleId: z.string().min(1),
  itemIndex: z.coerce.number().int().min(0),
  newQuantity: z.coerce.number().min(0),
});

export async function updateSaleItemQuantity(formData) {
  try {
    await connectToDatabase();

    const rawData = {
      saleId: formData.get("saleId")?.toString().trim(),
      itemIndex: formData.get("itemIndex")?.toString().trim(),
      newQuantity: formData.get("newQuantity")?.toString().trim(),
    };

    const validated = updateSaleItemSchema.parse(rawData);

    // Fetch the sale
    const sale = await Sale.findById(validated.saleId);
    if (!sale || sale.deletedAt) {
      return { success: false, error: "Sale not found" };
    }

    if (validated.itemIndex >= sale.items.length) {
      return { success: false, error: "Invalid item index" };
    }

    const item = sale.items[validated.itemIndex];
    const oldQuantity = item.quantity;
    const quantityDiff = validated.newQuantity - oldQuantity;

    if (quantityDiff === 0) {
      return { success: true }; // No change
    }

    // Update the item
    item.quantity = validated.newQuantity;
    item.lineTotal = item.quantity * item.price;

    // Recalculate sale total
    sale.totalAmount = sale.items.reduce((sum, it) => sum + it.lineTotal, 0);

    // Update product quantity and stats
    const product = await Product.findById(item.productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Calculate changes
    const quantityChange = -quantityDiff; // Negative because we're reversing the sale effect
    const oldLineTotal = oldQuantity * item.price;
    const revenueChange = item.lineTotal - oldLineTotal;
    const oldSaleTotal = sale.totalAmount - revenueChange; // Sale total before update
    const saleTotalChange = sale.totalAmount - oldSaleTotal;

    // Update product
    await Product.findByIdAndUpdate(item.productId, {
      $inc: {
        quantity: quantityChange, // Add back if quantity decreased, subtract if increased
        totalSold: quantityDiff, // Update total sold
        totalRevenue: revenueChange, // Update revenue
      },
    });

    // Note: currentCredit is now managed manually from the shop page only
    // Removed automatic currentCredit updates

    // Save the updated sale
    await sale.save();

    // Revalidate paths
    revalidatePath(`/staff/${sale.staffId}/sales`);
    revalidatePath("/sales");
    revalidatePath("/products");

    // Don't return the Mongoose document - it has circular references
    // Just return success without the data to avoid serialization issues
    return { success: true };
  } catch (error) {
    console.error("Error updating sale item quantity:", error);
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
          : error.message || "Failed to update sale item quantity",
    };
  }
}
