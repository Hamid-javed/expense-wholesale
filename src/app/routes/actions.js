"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../../lib/db";
import { RouteModel } from "../../models/Route";
import { Staff } from "../../models/Staff";

export async function createRoute(formData) {
  try {
    await connectToDatabase();
    const name = formData.get("name")?.trim();
    if (!name) {
      return { error: "Name is required" };
    }

    await RouteModel.create({ name });
    revalidatePath("/routes");
    return { success: true };
  } catch (error) {
    console.error("Error creating route:", error);
    return { error: error.message || "Failed to create route" };
  }
}

export async function updateRoute(formData) {
  try {
    await connectToDatabase();
    const routeId = formData.get("id")?.trim();
    const name = formData.get("name")?.trim();

    if (!routeId) {
      return { error: "Missing route id" };
    }

    if (!name) {
      return { error: "Name is required" };
    }

    const route = await RouteModel.findById(routeId);
    if (!route) {
      return { error: "Route not found" };
    }

    route.name = name;
    await route.save();

    revalidatePath("/routes");
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error updating route:", error);
    return { error: error.message || "Failed to update route" };
  }
}

export async function deleteRoute(formData) {
  try {
    await connectToDatabase();
    const routeId = formData.get("id")?.trim();

    if (!routeId) {
      return { error: "Missing route id" };
    }

    const route = await RouteModel.findById(routeId);
    if (!route) {
      return { error: "Route not found" };
    }

    // Soft delete: set deletedAt and isActive
    route.deletedAt = new Date();
    route.isActive = false;
    await route.save();

    // Unassign staff from this route
    const previousStaffId = route.assignedStaff?.toString();
    if (previousStaffId) {
      await Staff.findByIdAndUpdate(previousStaffId, { $unset: { routeId: "" } });
      route.assignedStaff = null;
      await route.save();
    }

    revalidatePath("/routes");
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error deleting route:", error);
    return { error: error.message || "Failed to delete route" };
  }
}

export async function assignStaffToRoute(formData) {
  try {
    await connectToDatabase();
    const routeId = formData.get("routeId")?.trim();
    const staffId = formData.get("staffId")?.trim();

    if (!routeId) {
      return { error: "Missing routeId" };
    }

    const route = await RouteModel.findById(routeId);
    if (!route) {
      return { error: "Route not found" };
    }

    // Handle unassignment (empty staffId)
    if (!staffId) {
      // Unassign: clear the route's assignedStaff and remove routeId from the previously assigned staff
      const previousStaffId = route.assignedStaff?.toString();
      route.assignedStaff = null;
      await route.save();

      if (previousStaffId) {
        await Staff.findByIdAndUpdate(previousStaffId, { $unset: { routeId: "" } });
      }

      revalidatePath("/routes");
      revalidatePath("/staff");
      return { success: true };
    }

    // Assign new staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return { error: "Staff not found" };
    }

    // Check if this staff is already assigned to a different route
    const existingRoute = await RouteModel.findOne({
      assignedStaff: staffId,
      _id: { $ne: routeId },
      deletedAt: null,
    });

    if (existingRoute) {
      return {
        error: `This staff is already assigned to route "${existingRoute.name}".`,
      };
    }

    // Unassign previous staff if any on this route
    const previousStaffId = route.assignedStaff?.toString();
    if (previousStaffId && previousStaffId !== staffId) {
      await Staff.findByIdAndUpdate(previousStaffId, { $unset: { routeId: "" } });
    }

    route.assignedStaff = staffId;
    await route.save();

    await Staff.findByIdAndUpdate(staffId, { routeId });

    revalidatePath("/routes");
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Error assigning staff to route:", error);
    return { error: error.message || "Failed to assign staff to route" };
  }
}
