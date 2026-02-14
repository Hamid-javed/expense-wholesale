import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import { Sale } from "../../../../../models/Sale";
import { Staff } from "../../../../../models/Staff";
import { RouteModel } from "../../../../../models/Route";
import { generateCombinedInvoicePdf } from "../../../../../lib/invoice";
import { getStartOfDayPK, getEndOfDayPK } from "../../../../../lib/dateUtils";

export async function GET(req, { params }) {
  await connectToDatabase();
  const { staffId } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const staff = await Staff.findById(staffId).lean();
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const route = staff.routeId
    ? await RouteModel.findById(staff.routeId).lean()
    : null;

  if (!dateStr) {
    return NextResponse.json(
      { error: "Date is required for combined invoice" },
      { status: 400 }
    );
  }

  const startOfDay = getStartOfDayPK(dateStr);
  const endOfDay = getEndOfDayPK(dateStr);

  const sales = await Sale.find({
    staffId,
    deletedAt: null,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate("shopId")
    .lean();

  // Group by shop and compute total per shop
  const shopMap = new Map();
  for (const sale of sales) {
    const shop = sale.shopId;
    if (!shop) continue;
    const id = shop._id?.toString() || shop.toString();
    const name = shop.name || "Unknown Shop";
    const phone = shop.phone || "";

    if (!shopMap.has(id)) {
      shopMap.set(id, {
        name,
        phone,
        cnic: shop.cnic || "",
        totalAmount: 0,
      });
    }
    shopMap.get(id).totalAmount += sale.totalAmount || 0;
  }

  const shops = Array.from(shopMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  if (shops.length === 0) {
    return NextResponse.json(
      { error: "No sales found for this staff on the selected date" },
      { status: 404 }
    );
  }

  const bytes = await generateCombinedInvoicePdf(shops, {
    staff,
    route,
    dateStr,
  });

  const filename = `combined-invoice-${staff.name}-${dateStr}.pdf`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
