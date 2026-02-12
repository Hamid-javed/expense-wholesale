"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "../../lib/db";
import { Sale } from "../../models/Sale";
import { InvoiceCounter } from "../../models/InvoiceCounter";
import { Shop } from "../../models/Shop";
import { Product } from "../../models/Product";
import { parseDatePK } from "../../lib/dateUtils";

const saleSchema = z.object({
  date: z.string(),
  staffId: z.string().min(1),
  shopId: z.string().min(1),
  paymentType: z.enum(["cash", "credit"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        price: z.coerce.number().nonnegative(),
      })
    )
    .min(1),
});

async function getNextInvoiceNumber() {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { key: "invoice" },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );
  return counter.lastNumber;
}

export async function createSale(formData) {
  try {
    await connectToDatabase();

    const rawItems = [];
    const itemCount = Number(formData.get("itemCount") || 0);

    for (let i = 0; i < itemCount; i += 1) {
      const productId = formData.get(`items[${i}][productId]`)?.trim();
      const quantity = formData.get(`items[${i}][quantity]`);
      const price = formData.get(`items[${i}][price]`);
      if (!productId || !quantity) continue;
      rawItems.push({ productId, quantity, price });
    }

    const parsed = saleSchema.safeParse({
      date: formData.get("date")?.trim(),
      staffId: formData.get("staffId")?.trim(),
      shopId: formData.get("shopId")?.trim(),
      paymentType: formData.get("paymentType")?.trim(),
      items: rawItems,
    });

    if (!parsed.success) {
      console.error(parsed.error.flatten());
      return { error: "Invalid sale data. Please check all fields." };
    }

    const data = parsed.data;

    // Validate: no zero quantity, and requested quantity must not exceed available
    const productIds = [...new Set(data.items.map((it) => it.productId))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const item of data.items) {
      if (item.quantity <= 0) {
        const p = productMap.get(item.productId);
        const name = p?.name || item.productId;
        return { error: `"${name}": quantity must be greater than zero.` };
      }
      const product = productMap.get(item.productId);
      if (!product) {
        return { error: "One or more products were not found." };
      }
      const available = product.quantity ?? 0;
      if (item.quantity > available) {
        return {
          error: `"${product.name}": only ${available} available (requested ${item.quantity}).`,
        };
      }
    }

    const date = parseDatePK(data.date); // Parse date in PK timezone
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    // Check if a sale exists for the same shop, staff, and date
    const existingSale = await Sale.findOne({
      shopId: data.shopId,
      staffId: data.staffId,
      date: { $gte: startOfDay, $lte: endOfDay },
      deletedAt: null,
    });

    const itemsWithTotals = data.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      price: it.price,
      lineTotal: it.quantity * it.price,
    }));

    const newTotalAmount = itemsWithTotals.reduce(
      (sum, it) => sum + it.lineTotal,
      0
    );

    let sale;
    let invoiceId;
    let productUpdates = [];
    let creditUpdate = 0;

    if (existingSale) {
      // Merge with existing sale
      invoiceId = existingSale.invoiceId; // Keep original invoice ID

      // Create a map of existing items by productId
      const existingItemsMap = new Map();
      existingSale.items.forEach((item) => {
        const productIdStr = item.productId.toString();
        if (existingItemsMap.has(productIdStr)) {
          // If product already exists, merge quantities
          const existing = existingItemsMap.get(productIdStr);
          existing.quantity += item.quantity;
          existing.lineTotal = existing.quantity * existing.price;
        } else {
          existingItemsMap.set(productIdStr, {
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            lineTotal: item.lineTotal,
          });
        }
      });

      // Merge new items with existing items
      itemsWithTotals.forEach((newItem) => {
        const productIdStr = newItem.productId.toString();
        if (existingItemsMap.has(productIdStr)) {
          // Same product: add quantities
          const existing = existingItemsMap.get(productIdStr);
          const oldQuantity = existing.quantity;
          existing.quantity += newItem.quantity;
          existing.lineTotal = existing.quantity * existing.price;
          
          // Track product updates (only for the new quantity)
          productUpdates.push({
            productId: newItem.productId,
            quantityChange: newItem.quantity,
            revenueChange: newItem.lineTotal,
            oldQuantity: oldQuantity,
          });
        } else {
          // Different product: add as new item
          existingItemsMap.set(productIdStr, newItem);
          
          // Track product updates
          productUpdates.push({
            productId: newItem.productId,
            quantityChange: newItem.quantity,
            revenueChange: newItem.lineTotal,
            oldQuantity: 0,
          });
        }
      });

      // Convert map back to array
      const mergedItems = Array.from(existingItemsMap.values());
      const mergedTotalAmount = mergedItems.reduce(
        (sum, it) => sum + it.lineTotal,
        0
      );

      // Calculate credit update (only for new amount if payment type is credit)
      if (data.paymentType === "credit") {
        creditUpdate = newTotalAmount; // Add new credit amount
      }

      // Update existing sale
      existingSale.items = mergedItems;
      existingSale.totalAmount = mergedTotalAmount;
      // Keep original payment type
      await existingSale.save();
      sale = existingSale;
    } else {
      // Create new sale
      invoiceId = await getNextInvoiceNumber();
      
      sale = await Sale.create({
        invoiceId,
        date,
        staffId: data.staffId,
        shopId: data.shopId,
        items: itemsWithTotals,
        totalAmount: newTotalAmount,
        paymentType: data.paymentType,
      });

      // Track all product updates for new sale
      productUpdates = itemsWithTotals.map((it) => ({
        productId: it.productId,
        quantityChange: it.quantity,
        revenueChange: it.lineTotal,
        oldQuantity: 0,
      }));

      // Calculate credit update
      if (data.paymentType === "credit") {
        creditUpdate = newTotalAmount;
      }
    }

    // Note: currentCredit is now managed manually from the shop page only
    // Removed automatic currentCredit updates

    // Update product quantities and stats (only for new quantities)
    await Promise.all(
      productUpdates.map((update) =>
        Product.findByIdAndUpdate(update.productId, {
          $inc: {
            totalSold: update.quantityChange,
            totalRevenue: update.revenueChange,
            quantity: -update.quantityChange, // Decrement stock quantity
          },
        })
      )
    );

    revalidatePath("/sales");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/staff/${data.staffId}/sales`);

    return { success: true, saleId: sale._id.toString(), invoiceId };
  } catch (error) {
    console.error("Error creating sale:", error);
    return { error: error.message || "Failed to create sale" };
  }
}

