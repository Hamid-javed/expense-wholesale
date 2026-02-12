import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import { Sale } from "../../../../../models/Sale";
import { Shop } from "../../../../../models/Shop";
import { Staff } from "../../../../../models/Staff";
import { RouteModel } from "../../../../../models/Route";
import { Product } from "../../../../../models/Product";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { INVOICE_PREFIX } from "../../../../../lib/config";
import { formatDatePK, getStartOfDayPK, getEndOfDayPK, getDateKeyPK } from "../../../../../lib/dateUtils";

export async function GET(_req, { params, searchParams }) {
  await connectToDatabase();
  const { shopId } = await params;
  const search = await searchParams;
  const dateStr = search?.date;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Fetch sales for this shop (filtered by date if provided)
  let query = {
    shopId: shopId,
    deletedAt: null,
  };

  if (dateStr) {
    const startOfDay = getStartOfDayPK(dateStr);
    const endOfDay = getEndOfDayPK(dateStr);
    query.date = { $gte: startOfDay, $lte: endOfDay };
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

  // Group sales by date
  const salesByDate = {};
  sales.forEach((sale) => {
    const dateKey = getDateKeyPK(sale.date);
    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = [];
    }
    salesByDate[dateKey].push(sale);
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
  drawText("Shop Sales Invoice", 50, y, titleSize, true);
  y -= 20;

  drawText(`Shop: ${shop.name}`, 50, y);
  y -= 16;

  if (shop.ownerName) {
    drawText(`Owner: ${shop.ownerName}`, 50, y);
    y -= 16;
  }

  if (shop.phone) {
    drawText(`Phone: ${shop.phone}`, 50, y);
    y -= 16;
  }

  if (dateStr) {
    drawText(`Date: ${dateStr}`, 50, y);
  } else {
    drawText(`All Sales`, 50, y);
  }
  y -= 20;

  // Process each date
  const dateKeys = Object.keys(salesByDate).sort();
  let grandTotal = 0;

  for (const dateKey of dateKeys) {
    const dateSales = salesByDate[dateKey];

    // Check if we need a new page
    if (y < 200) {
      page = pdfDoc.addPage(pageSize);
      y = height - 50;
    }

    // Date header
    drawText(`Date: ${dateKey}`, 50, y, 12, true);
    y -= 20;

    // Process each sale for this date
    for (const sale of dateSales) {
      if (y < 150) {
        page = pdfDoc.addPage(pageSize);
        y = height - 50;
      }

      const staff = sale.staffId;
      const invoiceNo = `${INVOICE_PREFIX}${sale.invoiceId}`;

      // Sale header
      drawText(`Invoice: ${invoiceNo}`, 50, y, 11, true);
      y -= 16;

      if (staff) {
        drawText(`Staff: ${staff.name}${staff.staffId ? ` (${staff.staffId})` : ""}`, 50, y);
        y -= 16;
      }

      drawText(`Payment: ${sale.paymentType}`, 50, y);
      y -= 16;

      // Products table header
      drawText("Product", 50, y);
      drawText("Qty", 200, y);
      drawText("Price", 280, y);
      drawText("Total", 360, y);
      y -= 16;

      // Draw line
      page.drawLine({
        start: { x: 50, y: y + 4 },
        end: { x: width - 50, y: y + 4 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      y -= 12;

      // Products
      for (const item of sale.items) {
        if (y < 80) {
          page = pdfDoc.addPage(pageSize);
          y = height - 50;
        }

        const product = item.productId;
        const name = product?.name || "Unknown";
        const qty = `${item.quantity}${product?.unit ? ` ${product.unit}` : ""}`;

        drawText(name, 50, y, 9);
        drawText(qty, 200, y, 9);
        drawText(item.price.toFixed(2), 280, y, 9);
        drawText(item.lineTotal.toFixed(2), 360, y, 9);
        y -= 14;
      }

      // Sale total
      y -= 8;
      drawText(`Sale Total: ${sale.totalAmount.toFixed(2)}`, 300, y, 10, true);
      y -= 20;

      grandTotal += sale.totalAmount || 0;
    }

    // Date total
    const dateTotal = dateSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    y -= 8;
    drawText(`Date Total: ${dateTotal.toFixed(2)}`, 400, y, 11, true);
    y -= 24;
  }

  // Grand total
  if (y < 100) {
    page = pdfDoc.addPage(pageSize);
    y = height - 50;
  }

  y -= 20;
  drawText("=".repeat(60), 50, y);
  y -= 20;
  drawText(`Grand Total: ${grandTotal.toFixed(2)}`, 400, y, 14, true);

  const bytes = await pdfDoc.save();
  const filename = `shop-invoice-${shop.name}-${dateStr || "all"}.pdf`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
