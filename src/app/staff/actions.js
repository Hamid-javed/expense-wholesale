"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../../lib/db";
import { Staff } from "../../models/Staff";
import { RouteModel } from "../../models/Route";
import { z } from "zod";

/** Get form value, supporting prefixed keys from serialized forms */
function getFormValue(formData, key) {
  let val = formData.get(key);
  if (val != null && val !== "") return val;
  for (const [k, v] of formData.entries()) {
    if (k === key || k.endsWith("_" + key)) return v;
  }
  return null;
}

const staffUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  routeId: z.string().optional(),
});

export async function createStaff(formData) {
  try {
    await connectToDatabase();

    const name = formData.get("name")?.trim();
    const phone = formData.get("phone")?.trim();
    const cnic = formData.get("cnic")?.trim();
    const routeId = formData.get("routeId")?.trim() || null;

    if (!name) {
      return { error: "Name is required" };
    }

    // simple 6-digit id; improve later to avoid collisions
    const staffId = String(Math.floor(100000 + Math.random() * 900000));

    const staff = await Staff.create({
      name,
      phone: phone || undefined,
      cnic: cnic || undefined,
      routeId: routeId || undefined,
      staffId,
    });

    // If a route was selected during creation, keep route <-> staff in sync
    if (routeId) {
      // Ensure this staff is not assigned to any other routes
      await RouteModel.updateMany(
        { assignedStaff: staff._id, _id: { $ne: routeId } },
        { $unset: { assignedStaff: "" } }
      );

      const route = await RouteModel.findById(routeId);
      if (route) {
        const previousStaffId = route.assignedStaff?.toString();
        route.assignedStaff = staff._id;
        await route.save();

        // If some other staff previously owned this route, clear their routeId
        if (previousStaffId && previousStaffId !== staff._id.toString()) {
          await Staff.findByIdAndUpdate(previousStaffId, {
            $unset: { routeId: "" },
          });
        }
      }

      revalidatePath("/routes");
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error creating staff:", error);
    return { error: error.message || "Failed to create staff" };
  }
}

export async function updateStaff(formData) {
  try {
    await connectToDatabase();

    const rawData = {
      id: getFormValue(formData, "id")?.toString().trim(),
      name: getFormValue(formData, "name")?.toString().trim(),
      phone: getFormValue(formData, "phone")?.toString().trim() || "",
      cnic: getFormValue(formData, "cnic")?.toString().trim() || "",
      routeId: getFormValue(formData, "routeId")?.toString().trim() || "",
    };

    const validated = staffUpdateSchema.parse(rawData);

    const staff = await Staff.findById(validated.id);
    if (!staff || staff.deletedAt) {
      return { error: "Staff not found" };
    }

    const updateData = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.phone !== undefined) updateData.phone = validated.phone || undefined;
    if (validated.cnic !== undefined) updateData.cnic = validated.cnic || undefined;
    if (validated.routeId !== undefined) updateData.routeId = validated.routeId || undefined;

    const newRouteId = validated.routeId ? validated.routeId : null;
    const oldRouteId = staff.routeId?.toString() || null;
    const routeChanged = validated.routeId !== undefined && (newRouteId || "") !== (oldRouteId || "");

    await Staff.findByIdAndUpdate(validated.id, updateData);

    // Sync route assignment when routeId changes
    if (routeChanged) {
      if (oldRouteId) {
        await RouteModel.findByIdAndUpdate(oldRouteId, { $unset: { assignedStaff: "" } });
      }
      if (newRouteId) {
        await RouteModel.updateMany(
          { assignedStaff: staff._id, _id: { $ne: newRouteId } },
          { $unset: { assignedStaff: "" } }
        );
        const route = await RouteModel.findById(newRouteId);
        if (route) {
          const previousStaffId = route.assignedStaff?.toString();
          route.assignedStaff = staff._id;
          await route.save();
          if (previousStaffId && previousStaffId !== staff._id.toString()) {
            await Staff.findByIdAndUpdate(previousStaffId, { $unset: { routeId: "" } });
          }
        }
      }
      revalidatePath("/routes");
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff:", error);
    return {
      error: error instanceof z.ZodError
        ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        : error.message || "Failed to update staff",
    };
  }
}

export async function toggleStaffActive(formData) {
  try {
    await connectToDatabase();
    const id = formData.get("id")?.trim();
    if (!id) {
      return { error: "Missing id" };
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return { error: "Staff not found" };
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error toggling staff active:", error);
    return { error: error.message || "Failed to update staff status" };
  }
}
