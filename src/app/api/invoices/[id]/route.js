import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { Sale } from "../../../../models/Sale";
import { Shop } from "../../../../models/Shop";
import { Staff } from "../../../../models/Staff";
import { RouteModel } from "../../../../models/Route";
import { generateInvoicePdf } from "../../../../lib/invoice";
import { INVOICE_PREFIX } from "../../../../lib/config";

export async function GET(_req, { params }) {
  await connectToDatabase();
  const { id } = await params;

  const sale = await Sale.findById(id).populate("shopId").populate("staffId");
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const shop = sale.shopId
    ? await Shop.findById(sale.shopId._id || sale.shopId)
    : null;
  const staff = sale.staffId
    ? await Staff.findById(sale.staffId._id || sale.staffId)
    : null;
  const route = staff?.routeId
    ? await RouteModel.findById(staff.routeId)
    : null;

  // Load products for human-readable names
  const populatedSale = sale.toObject();
  const populatedItems = [];
  for (const item of populatedSale.items) {
    const product = await import("../../../../models/Product.js").then(
      (m) => m.Product
    );
    const p = await product.findById(item.productId);
    populatedItems.push({ ...item, product: p ? { name: p.name } : null });
  }
  populatedSale.items = populatedItems;

  const bytes = await generateInvoicePdf(populatedSale, {
    shop,
    staff,
    route,
  });

  const response = new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${INVOICE_PREFIX}${sale.invoiceId}.pdf"`,
    },
  });

  return response;
}

