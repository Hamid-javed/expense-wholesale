"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "../../lib/db";
import { Product } from "../../models/Product";
import { UNITS } from "../../lib/config";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.enum(UNITS),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().nonnegative().default(0),
});

export async function createProduct(formData) {
  try {
    await connectToDatabase();

    const quantityInput = formData.get("quantity");
    const quantityValue = quantityInput !== null && quantityInput !== undefined && quantityInput !== "" 
      ? Number(quantityInput) 
      : 0;

    const parsed = productSchema.safeParse({
      name: formData.get("name")?.trim(),
      sku: formData.get("sku")?.trim(),
      unit: formData.get("unit") || "pcs",
      price: formData.get("price"),
      quantity: quantityValue,
    });

    if (!parsed.success) {
      console.error(parsed.error.flatten());
      return { error: "Invalid product data" };
    }

    const data = parsed.data;

    await Product.create({
      name: data.name,
      sku: data.sku,
      unit: data.unit,
      price: data.price,
      quantity: data.quantity ?? 0, // Explicitly set quantity, default to 0
    });

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error creating product:", error);
    return { error: error.message || "Failed to create product" };
  }
}

export async function updateProduct(formData) {
  try {
    await connectToDatabase();

    const id = formData.get("id")?.trim();
    if (!id) {
      return { error: "Missing product id" };
    }

    // Get all form values
    const name = formData.get("name")?.trim();
    const sku = formData.get("sku")?.trim();
    const unit = formData.get("unit");
    const price = formData.get("price");
    const quantity = formData.get("quantity");

    // Build update object
    const updateData = {};

    if (name) {
      updateData.name = name;
    }
    if (sku) {
      updateData.sku = sku;
    }
    if (unit) {
      updateData.unit = unit;
    }
    if (price !== null && price !== undefined && price !== "") {
      updateData.price = Number(price);
    }
    
    // Quantity handling - always include if provided (even if 0)
    if (quantity !== null && quantity !== undefined && quantity !== "") {
      const qtyNum = Number(quantity);
      if (!isNaN(qtyNum) && qtyNum >= 0) {
        updateData.quantity = qtyNum;
      }
    }

    // Validate non-quantity fields
    const validationData = { ...updateData };
    const quantityValue = validationData.quantity;
    delete validationData.quantity;

    const parsed = productSchema.partial().safeParse(validationData);

    if (!parsed.success) {
      console.error("Validation error:", parsed.error.flatten());
      return { error: "Invalid product data" };
    }

    // Build final update - include validated fields + quantity
    const finalUpdate = { ...parsed.data };
    if (quantityValue !== undefined) {
      finalUpdate.quantity = quantityValue;
    }

    await Product.findByIdAndUpdate(
      id,
      finalUpdate,
      { new: true }
    );

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error updating product:", error);
    return { error: error.message || "Failed to update product" };
  }
}

export async function toggleProductActive(formData) {
  try {
    await connectToDatabase();
    const id = formData.get("id")?.trim();
    if (!id) {
      return { error: "Missing product id" };
    }

    const product = await Product.findById(id);
    if (!product) {
      return { error: "Product not found" };
    }

    product.isActive = !product.isActive;
    await product.save();

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error toggling product active:", error);
    return { error: error.message || "Failed to update product status" };
  }
}

