"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../../lib/db";
import { Shop } from "../../models/Shop";
import { z } from "zod";

const shopUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  currentCredit: z.coerce.number().min(0).optional(),
  routeId: z.string().optional(),
});

export async function createShop(formData) {
  try {
    await connectToDatabase();
    const name = formData.get("name")?.trim();
    const ownerName = formData.get("ownerName")?.trim();
    const phone = formData.get("phone")?.trim();
    const creditLimit = Number(formData.get("creditLimit") || 0);
    const routeId = formData.get("routeId")?.trim() || null;

    if (!name) {
      return { error: "Name is required" };
    }

    await Shop.create({
      name,
      ownerName: ownerName || undefined,
      phone: phone || undefined,
      creditLimit,
      routeId: routeId || undefined,
    });

    revalidatePath("/shops");
    return { success: true };
  } catch (error) {
    console.error("Error creating shop:", error);
    return { error: error.message || "Failed to create shop" };
  }
}

export async function updateShop(formData) {
  try {
    await connectToDatabase();

    const rawData = {
      id: formData.get("id")?.toString().trim(),
      name: formData.get("name")?.toString().trim(),
      ownerName: formData.get("ownerName")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || "",
      creditLimit: formData.get("creditLimit")?.toString().trim() || "0",
      currentCredit: formData.get("currentCredit")?.toString().trim() || "0",
      routeId: formData.get("routeId")?.toString().trim() || "",
    };

    const validated = shopUpdateSchema.parse(rawData);

    const shop = await Shop.findById(validated.id);
    if (!shop || shop.deletedAt) {
      return { error: "Shop not found" };
    }

    // Determine final creditLimit and currentCredit values
    const finalCreditLimit = validated.creditLimit !== undefined 
      ? validated.creditLimit 
      : shop.creditLimit;
    const finalCurrentCredit = validated.currentCredit !== undefined 
      ? validated.currentCredit 
      : shop.currentCredit;

    // Validate: currentCredit cannot exceed creditLimit
    if (finalCurrentCredit > finalCreditLimit) {
      return { 
        error: `Current Credit (${finalCurrentCredit}) cannot exceed Credit Limit (${finalCreditLimit}). Please increase Credit Limit first.` 
      };
    }

    // Build update object
    const updateData = {};
    if (validated.name) {
      updateData.name = validated.name;
    }
    if (validated.ownerName !== undefined) {
      updateData.ownerName = validated.ownerName || undefined;
    }
    if (validated.phone !== undefined) {
      updateData.phone = validated.phone || undefined;
    }
    if (validated.creditLimit !== undefined) {
      updateData.creditLimit = validated.creditLimit;
    }
    if (validated.currentCredit !== undefined) {
      updateData.currentCredit = validated.currentCredit;
    }
    if (validated.routeId !== undefined) {
      updateData.routeId = validated.routeId || undefined;
    }

    await Shop.findByIdAndUpdate(validated.id, updateData);

    revalidatePath("/shops");
    return { success: true };
  } catch (error) {
    console.error("Error updating shop:", error);
    return {
      error:
        error instanceof z.ZodError
          ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
          : error.message || "Failed to update shop",
    };
  }
}

export async function toggleShopActive(formData) {
  try {
    await connectToDatabase();
    const id = formData.get("id")?.trim();
    if (!id) {
      return { error: "Missing id" };
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      return { error: "Shop not found" };
    }

    shop.isActive = !shop.isActive;
    await shop.save();

    revalidatePath("/shops");
    return { success: true };
  } catch (error) {
    console.error("Error toggling shop active:", error);
    return { error: error.message || "Failed to update shop status" };
  }
}
