"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../../lib/db";
import { Shop } from "../../models/Shop";
import { z } from "zod";

/** Get form value, supporting prefixed keys like "1_cnic" from serialized forms */
function getFormValue(formData, key) {
  let val = formData.get(key);
  if (val != null && val !== "") return val;
  for (const [k, v] of formData.entries()) {
    if (k === key || k.endsWith("_" + key)) return v;
  }
  return null;
}

const shopUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  currentCredit: z.coerce.number().min(0).optional(),
  routeId: z.string().optional(),
});

export async function createShop(formData) {
  try {
    await connectToDatabase();
    const name = getFormValue(formData, "name")?.toString().trim();
    const ownerName = getFormValue(formData, "ownerName")?.toString().trim();
    const phone = getFormValue(formData, "phone")?.toString().trim();
    const cnic = getFormValue(formData, "cnic")?.toString().trim();
    const routeId = getFormValue(formData, "routeId")?.toString().trim() || null;

    if (!name) {
      return { error: "Name is required" };
    }

    await Shop.create({
      name,
      ownerName: ownerName || undefined,
      phone: phone || undefined,
      cnic: cnic || undefined,
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
      id: getFormValue(formData, "id")?.toString().trim(),
      name: getFormValue(formData, "name")?.toString().trim(),
      ownerName: getFormValue(formData, "ownerName")?.toString().trim() || "",
      phone: getFormValue(formData, "phone")?.toString().trim() || "",
      cnic: getFormValue(formData, "cnic")?.toString().trim() || "",
      currentCredit: getFormValue(formData, "currentCredit")?.toString().trim() || "0",
      routeId: getFormValue(formData, "routeId")?.toString().trim() || "",
    };

    const validated = shopUpdateSchema.parse(rawData);

    const shop = await Shop.findById(validated.id);
    if (!shop || shop.deletedAt) {
      return { error: "Shop not found" };
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
    if (validated.cnic !== undefined) {
      updateData.cnic = validated.cnic || undefined;
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
