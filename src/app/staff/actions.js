"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../../lib/db";
import { Staff } from "../../models/Staff";
import { RouteModel } from "../../models/Route";

export async function createStaff(formData) {
  try {
    await connectToDatabase();

    const name = formData.get("name")?.trim();
    const phone = formData.get("phone")?.trim();
    const routeId = formData.get("routeId")?.trim() || null;

    if (!name) {
      return { error: "Name is required" };
    }

    // simple 6-digit id; improve later to avoid collisions
    const staffId = String(Math.floor(100000 + Math.random() * 900000));

    const staff = await Staff.create({
      name,
      phone: phone || undefined,
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
