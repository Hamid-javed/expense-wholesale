import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import { Sale } from "../../../../../models/Sale";
import { Shop } from "../../../../../models/Shop";
import { Staff } from "../../../../../models/Staff";
import { RouteModel } from "../../../../../models/Route";
import { Product } from "../../../../../models/Product";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { INVOICE_PREFIX } from "../../../../../lib/config";
import { formatDatePK, getStartOfDayPK, getEndOfDayPK } from "../../../../../lib/dateUtils";

export async function GET(_req, { params, searchParams }) {
  await connectToDatabase();
  const { staffId } = await params;
  const search = await searchParams;
  const dateStr = search?.date;

  const staff = await Staff.findById(staffId);
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const route = staff.routeId
    ? await RouteModel.findById(staff.routeId)
    : null;

  // Fetch all sales for this staff (or filtered by date if provided)
  let query = {
    staffId: staffId,
    deletedAt: null,
  };

  if (dateStr) {
    const startOfDay = getStartOfDayPK(dateStr);
    const endOfDay = getEndOfDayPK(dateStr);
    query.date = { $gte: startOfDay, $lte: endOfDay };
  }

  const sales = await Sale.find(query)
    .populate("shopId")
    .populate("items.productId")
    .sort({ date: 1, shopId: 1 })
    .lean();

  if (sales.length === 0) {
    return NextResponse.json(
      { error: "No sales found for this staff member" },
      { status: 404 }
    );
  }

  // Group sales by shop
  const salesByShop = {};
  sales.forEach((sale) => {
    const shopId = sale.shopId?._id?.toString() || sale.shopId?.toString() || "unknown";
    if (!salesByShop[shopId]) {
      salesByShop[shopId] = {
        shop: sale.shopId,
        sales: [],
      };
    }
    salesByShop[shopId].sales.push(sale);
  });

  // Generate PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89]; // A4
  let page = pdfDoc.addPage(pageSize);
  const { height, width } = page.getSize();

  let y = height - 50;
  const fontSize = 10;
  const titleSize = 14;

  const drawText = (text, x, yPos, size = fontSize, isBold = false) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  // Header
  drawText("Combined Invoice", 50, y, titleSize, true);
  y -= 20;

  drawText(`Staff: ${staff.name}${staff.staffId ? ` (${staff.staffId})` : ""}`, 50, y);
  y -= 16;

  if (route) {
    drawText(`Route: ${route.name}`, 50, y);
    y -= 16;
  }

  if (dateStr) {
    drawText(`Date: ${dateStr}`, 50, y);
  } else {
    drawText(`All Sales`, 50, y);
  }
  y -= 20;

  // Process each shop
  const shopIds = Object.keys(salesByShop);
  let grandTotal = 0;
  let grandCashTotal = 0;

  for (const shopId of shopIds) {
    const { shop, sales: shopSales } = salesByShop[shopId];
    const shopName = shop?.name || "Unknown Shop";

    // Check if we need a new page
    if (y < 150) {
      page = pdfDoc.addPage(pageSize);
      y = height - 50;
    }

    // Shop header
    drawText(`Shop: ${shopName}`, 50, y, 12, true);
    y -= 16;

    if (shop?.phone) {
      drawText(`Phone: ${shop.phone}`, 50, y);
      y -= 16;
    }

    y -= 8;

    // Table header
    drawText("Invoice", 50, y);
    drawText("Date", 120, y);
    drawText("Products", 200, y);
    drawText("Amount", 450, y);
    drawText("Type", 520, y);
    y -= 16;

    // Draw line
    page.drawLine({
      start: { x: 50, y: y + 4 },
      end: { x: width - 50, y: y + 4 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= 12;

    // Sales for this shop
    let shopTotal = 0;
    let shopCashTotal = 0;

    for (const sale of shopSales) {
      if (y < 100) {
        page = pdfDoc.addPage(pageSize);
        y = height - 50;
      }

      const invoiceNo = `${INVOICE_PREFIX}${sale.invoiceId}`;
      const saleDate = formatDatePK(sale.date);
      const productNames = sale.items
        .map((item) => {
          const product = item.productId;
          const name = product?.name || "Unknown";
          return `${name} (${item.quantity})`;
        })
        .join(", ");

      drawText(invoiceNo, 50, y, 9);
      drawText(saleDate, 120, y, 9);
      
      // Truncate product names if too long
      const maxProductWidth = 240;
      let productText = productNames;
      if (productText.length > 40) {
        productText = productText.substring(0, 37) + "...";
      }
      drawText(productText, 200, y, 9);
      
      drawText(sale.totalAmount.toFixed(2), 450, y, 9);
      drawText(sale.paymentType, 520, y, 9);
      y -= 14;

      shopTotal += sale.totalAmount || 0;
      if (sale.paymentType === "cash") {
        shopCashTotal += sale.totalAmount || 0;
      }
    }

    // Shop totals
    y -= 8;
    drawText(`Shop Total: ${shopTotal.toFixed(2)}`, 400, y, 10, true);
    y -= 14;
    drawText(`Shop Cash: ${shopCashTotal.toFixed(2)}`, 400, y, 10, true);
    y -= 20;

    grandTotal += shopTotal;
    grandCashTotal += shopCashTotal;
  }

  // Grand totals
  if (y < 100) {
    page = pdfDoc.addPage(pageSize);
    y = height - 50;
  }

  y -= 20;
  drawText("─".repeat(60), 50, y);
  y -= 20;
  drawText(`Grand Total: ${grandTotal.toFixed(2)}`, 400, y, 12, true);
  y -= 16;
  drawText(`Grand Cash Total: ${grandCashTotal.toFixed(2)}`, 400, y, 12, true);

  const bytes = await pdfDoc.save();
  const filename = `combined-invoice-${staff.name}-${dateStr || "all"}.pdf`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
