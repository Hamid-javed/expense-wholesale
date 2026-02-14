import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { INVOICE_PREFIX, COMPANY } from "./config";

/**
 * Format date as DD.MM.YYYY with weekday (e.g. "01.02.2026 Sun")
 */
function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays[d.getDay()];
  return `${day}.${month}.${year} ${weekday}`;
}

function formatNum(n) {
  return (n ?? 0).toFixed(2);
}

export async function generateInvoicePdf(
  sale,
  { shop, staff, route, otName, otDate }
) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const margin = 40;
  const colLeft = margin;
  const colRight = width / 2 + 10;
  let y = height - margin;

  const small = 9;
  const normal = 10;
  const heading = 14;

  const draw = (text, x, yPos, size = normal, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(String(text), {
      x,
      y: yPos,
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
  };

  const drawLine = (x1, y1, x2, y2) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };

  // --- TOP LEFT: Company ---
  draw(COMPANY.name, colLeft, y, heading, true);
  y -= 18;
  draw(`${COMPANY.address} / ${COMPANY.phone}`, colLeft, y, small);
  y -= 14;
  draw(COMPANY.ntnStrn, colLeft, y, small);
  y -= 24;

  // --- TOP LEFT: Outlet / Customer ---
  draw("Outlet:", colLeft, y, small, true);
  y -= 12;
  const outletLine = shop
    ? `${shop.name}${shop.ownerName ? ` / ${shop.ownerName}` : ""}`
    : "-";
  draw(outletLine, colLeft, y, small);
  y -= 12;
  if (shop?.phone) {
    draw(`Contact: ${shop.phone}`, colLeft, y, small);
    y -= 12;
  }
  draw(`CNIC: ${shop?.cnic || "-"}`, colLeft, y, small);
  y -= 12;
  y -= 8;

  // --- TOP RIGHT: Payment & Order ---
  let yRight = height - margin;
  draw("Payment Terms:", colRight, yRight, small, true);
  draw(
    (sale.paymentType || "CASH").toUpperCase(),
    colRight + 90,
    yRight,
    small
  );
  yRight -= 14;

  draw("Invoice No:", colRight, yRight, small, true);
  draw(`${INVOICE_PREFIX}${sale.invoiceId}`, colRight + 90, yRight, small);
  yRight -= 14;

  const orderDate = otDate
    ? formatDateDDMMYYYY(new Date(otDate + "T12:00:00"))
    : formatDateDDMMYYYY(sale.date);
  const delivDate = formatDateDDMMYYYY(sale.date);
  draw("Order / Deliv. Date:", colRight, yRight, small, true);
  draw(`${orderDate} / ${delivDate}`, colRight + 90, yRight, small);
  yRight -= 14;

  if (otName) {
    draw("OB Name / OB No:", colRight, yRight, small, true);
    draw(otName, colRight + 90, yRight, small);
    yRight -= 14;
  }

  if (staff) {
    draw("Salesman:", colRight, yRight, small, true);
    draw(staff.name || "-", colRight + 90, yRight, small);
    yRight -= 14;
    draw("Salesman CNIC:", colRight, yRight, small, true);
    draw(staff.cnic || "-", colRight + 90, yRight, small);
    yRight -= 14;
  }

  if (route) {
    draw("Route:", colRight, yRight, small, true);
    draw(route.name || "-", colRight + 90, yRight, small);
    yRight -= 14;
  }

  // --- CASH MEMO / INVOICE Header ---
  y = Math.min(y, yRight) - 20;
  drawLine(margin, y + 10, width - margin, y + 10);
  y -= 16;
  draw("CASH MEMO / INVOICE", width / 2 - 70, y, 12, true);
  y -= 24;

  // --- Product table header ---
  const tableLeft = margin;
  const colW = [
    { w: 110, x: tableLeft }, // Product
    { w: 35, x: tableLeft + 110 }, // Unit
    { w: 40, x: tableLeft + 145 }, // Quantity
    { w: 35, x: tableLeft + 185 }, // Free
    { w: 50, x: tableLeft + 220 }, // Trade Price
    { w: 45, x: tableLeft + 270 }, // Tax
    { w: 45, x: tableLeft + 315 }, // Offer
    { w: 40, x: tableLeft + 360 }, // Disc
    { w: 60, x: tableLeft + 400 }, // Net
  ];

  const headers = [
    "Product Code/Description",
    "Unit",
    "Quantity",
    "Free",
    "Trade Price",
    "Tax",
    "Offer",
    "Disc",
    "Net Amount",
  ];
  headers.forEach((h, i) => {
    draw(h, colW[i].x, y, 7, true);
  });
  y -= 14;
  drawLine(margin, y, width - margin, y);
  y -= 12;

  // --- Product rows ---
  let totalTax = 0;
  let totalNet = 0;
  let totalQty = 0;

  for (const item of sale.items) {
    const prod = item.product;
    const name = prod?.name || "Unknown";
    const sku = prod?.sku || "-";
    const desc = `${sku} / ${name}`;
    const qty = item.quantity ?? 0;
    const price = item.price ?? 0;
    const net = item.lineTotal ?? 0;
    const unit = prod?.unit || "pcs";

    totalQty += qty;
    totalNet += net;

    draw(desc.length > 28 ? desc.slice(0, 26) + ".." : desc, colW[0].x, y, 8);
    draw(unit, colW[1].x, y, 8);
    draw(String(qty), colW[2].x, y, 8);
    draw("0", colW[3].x, y, 8);
    draw(formatNum(price), colW[4].x, y, 8);
    draw("0.00", colW[5].x, y, 8);
    draw("0.00", colW[6].x, y, 8);
    draw("0.00", colW[7].x, y, 8);
    draw(formatNum(net), colW[8].x, y, 8);
    y -= 14;
  }

  // --- Summary row ---
  drawLine(margin, y, width - margin, y);
  y -= 14;
  draw(`TOTAL SKUs: ${sale.items.length}`, colW[0].x, y, 8, true);
  draw(String(totalQty), colW[2].x, y, 8, true);
  draw("0.00", colW[3].x, y, 8, true);
  draw(formatNum(totalTax), colW[5].x, y, 8, true);
  draw(formatNum(totalNet), colW[8].x, y, 8, true);
  y -= 20;

  // --- Totals summary (right side) ---
  const totalLabel = "Total Amount:";
  const totalVal = `${formatNum(sale.totalAmount)}/-`;
  draw(totalLabel, width - margin - 130, y, small, true);
  draw(totalVal, width - margin - 55, y, normal, true);
  y -= 24;

  // --- Terms & Conditions ---
  draw("Terms & Conditions", margin, y, small, true);
  y -= 12;
  draw(
    "Goods once sold will not be taken back. Please check stock & expiry at the time of delivery.",
    margin,
    y,
    8
  );
  y -= 10;
  draw("Free units will not be given without bill. Payment terms as per agreement.", margin, y, 8);
  y -= 20;

  // --- Signature blocks ---
  const sigWidth = (width - 2 * margin - 40) / 3;
  draw("Checked By", margin, y, small);
  draw("Delivered By", margin + sigWidth + 20, y, small);
  draw("Shop Keeper Sign. & Stamp", margin + 2 * (sigWidth + 20), y, small);
  y -= 8;
  drawLine(margin, y, margin + sigWidth, y);
  drawLine(margin + sigWidth + 20, y, margin + 2 * sigWidth + 20, y);
  drawLine(margin + 2 * (sigWidth + 20), y, width - margin, y);

  const bytes = await pdfDoc.save();
  return bytes;
}

/**
 * Generate combined invoice PDF: all shops with name, number, total amount,
 * and empty Cash/Credit columns for salesman to fill.
 */
export async function generateCombinedInvoicePdf(shops, { staff, route, dateStr }) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const margin = 40;
  const colLeft = margin;
  const colRight = width / 2 + 10;
  let y = height - margin;

  const small = 9;
  const normal = 10;
  const heading = 14;

  const draw = (text, x, yPos, size = normal, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(String(text ?? ""), {
      x,
      y: yPos,
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
  };

  const drawLine = (x1, y1, x2, y2) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };

  // --- TOP LEFT: Company ---
  draw(COMPANY.name, colLeft, y, heading, true);
  y -= 18;
  draw(`${COMPANY.address} / ${COMPANY.phone}`, colLeft, y, small);
  y -= 14;
  draw(COMPANY.ntnStrn, colLeft, y, small);
  y -= 24;

  // --- TOP RIGHT: Salesman & Date ---
  let yRight = height - margin;
  draw("Salesman:", colRight, yRight, small, true);
  draw(staff?.name || "-", colRight + 90, yRight, small);
  yRight -= 14;
  draw("Salesman CNIC:", colRight, yRight, small, true);
  draw(staff?.cnic || "-", colRight + 90, yRight, small);
  yRight -= 14;

  if (route) {
    draw("Route:", colRight, yRight, small, true);
    draw(route.name || "-", colRight + 90, yRight, small);
    yRight -= 14;
  }

  draw("Date:", colRight, yRight, small, true);
  draw(dateStr || "-", colRight + 90, yRight, small);


  // --- Table header: Shop Name | Number | CNIC | Cash | Credit | Total Amount ---
  const tableLeft = margin;
  const colW = [
    { w: 130, x: tableLeft }, // Shop Name
    { w: 85, x: tableLeft + 130 }, // Number
    { w: 95, x: tableLeft + 215 }, // CNIC
    { w: 65, x: tableLeft + 310 }, // Cash (empty)
    { w: 65, x: tableLeft + 375 }, // Credit (empty)
    { w: 80, x: tableLeft + 440 }, // Total Amount
  ];

  draw("Shop Name", colW[0].x, y, 9, true);
  draw("Number", colW[1].x, y, 9, true);
  draw("CNIC", colW[2].x, y, 9, true);
  draw("Cash", colW[3].x, y, 9, true);
  draw("Credit", colW[4].x, y, 9, true);
  draw("Total Amount", colW[5].x, y, 9, true);
  y -= 14;
  drawLine(margin, y, width - margin, y);
  y -= 12;

  // --- Shop rows ---
  let grandTotal = 0;
  const lineGap = 6; // gap between row text and underline
  const rowGap = 10; // gap between underline and next row

  for (const row of shops) {
    if (y < 80) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin - 40;
      drawLine(margin, y + 12, width - margin, y + 12);
      y -= 12;
    }

    const name = row.name?.toString().slice(0, 22) || "-";
    const number = row.phone || row.number || "-";
    const cnic = row.cnic?.toString() || "-";
    const total = row.totalAmount ?? 0;

    draw(name, colW[0].x, y, 9);
    draw(number, colW[1].x, y, 9);
    draw(cnic, colW[2].x, y, 8);
    // Cash and Credit left empty for salesman to write
    draw(`${total.toFixed(2)}/-`, colW[5].x, y, 9);
    // Draw line just below row, then leave gap before next row
    y -= lineGap;
    drawLine(margin, y, width - margin, y);
    y -= rowGap;

    grandTotal += total;
  }

  // --- Total row ---
  draw("Total Amount:", colW[0].x, y, 9, true);
  draw(`${grandTotal.toFixed(2)}/-`, colW[5].x, y, 10, true);

  const bytes = await pdfDoc.save();
  return bytes;
}
