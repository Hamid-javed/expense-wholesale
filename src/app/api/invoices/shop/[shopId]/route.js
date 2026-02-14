import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import { Sale } from "../../../../../models/Sale";
import { Shop } from "../../../../../models/Shop";
import { Staff } from "../../../../../models/Staff";
import { RouteModel } from "../../../../../models/Route";
import { generateInvoicePdf } from "../../../../../lib/invoice";
import { PDFDocument } from "pdf-lib";
import { getStartOfDayPK, getEndOfDayPK } from "../../../../../lib/dateUtils";

export async function GET(req, { params }) {
  await connectToDatabase();
  const { shopId } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const otName = searchParams.get("ot") || null;
  const otDate = searchParams.get("otDate") || null;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const query = {
    shopId,
    deletedAt: null,
  };

  if (dateStr) {
    query.date = {
      $gte: getStartOfDayPK(dateStr),
      $lte: getEndOfDayPK(dateStr),
    };
  }

  const sales = await Sale.find(query)
    .populate("staffId")
    .populate("items.productId")
    .sort({ date: 1 })
    .lean();

  if (sales.length === 0) {
    return NextResponse.json(
      { error: "No sales found for this shop" },
      { status: 404 }
    );
  }

  const shopObj = shop.toObject ? shop.toObject() : shop;

  const mergedPdf = await PDFDocument.create();

  for (const sale of sales) {
    const staff = sale.staffId
      ? await Staff.findById(sale.staffId._id || sale.staffId).lean()
      : null;
    const route = staff?.routeId
      ? await RouteModel.findById(staff.routeId).lean()
      : null;

    const populatedSale = { ...sale };
    populatedSale.items = sale.items.map((item) => {
      const p = item.productId;
      return {
        ...item,
        product: p
          ? { name: p.name, sku: p.sku, unit: p.unit }
          : null,
      };
    });

    const bytes = await generateInvoicePdf(populatedSale, {
      shop: shopObj,
      staff,
      route,
      otName,
      otDate,
    });

    const salePdf = await PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(salePdf, salePdf.getPageIndices());
    pages.forEach((p) => mergedPdf.addPage(p));
  }

  const bytes = await mergedPdf.save();
  const filename = `shop-day-report-${shop.name}-${dateStr || "all"}.pdf`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
