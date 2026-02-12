import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { INVOICE_PREFIX } from "./config";
import { formatDatePK } from "./dateUtils";

export async function generateInvoicePdf(sale, { shop, staff, route }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  let y = height - 50;
  const fontSize = 12;

  const drawText = (text, x, yPos) => {
    page.drawText(text, { x, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
  };

  drawText("Invoice", 50, y);
  y -= 24;

  drawText(`Invoice No: ${INVOICE_PREFIX}${sale.invoiceId}`, 50, y);
  y -= 16;
  drawText(`Date: ${formatDatePK(sale.date)}`, 50, y);
  y -= 16;

  if (staff) {
    drawText(`Staff: ${staff.name} (${staff.staffId || ""})`, 50, y);
    y -= 16;
  }

  if (route) {
    drawText(`Route: ${route.name}`, 50, y);
    y -= 16;
  }

  if (shop) {
    drawText(`Shop: ${shop.name}`, 50, y);
    y -= 16;
    if (shop.phone) {
      drawText(`Phone: ${shop.phone}`, 50, y);
      y -= 16;
    }
  }

  y -= 16;
  drawText("Products", 50, y);
  y -= 20;

  drawText("Name", 50, y);
  drawText("Qty", 260, y);
  drawText("Price", 320, y);
  drawText("Total", 400, y);
  y -= 16;

  sale.items.forEach((item) => {
    const name = item.product?.name || "";
    drawText(name, 50, y);
    drawText(String(item.quantity), 260, y);
    drawText(item.price.toFixed(2), 320, y);
    drawText(item.lineTotal.toFixed(2), 400, y);
    y -= 16;
  });

  y -= 24;
  drawText(`Total Amount: ${sale.totalAmount.toFixed(2)}`, 50, y);
  y -= 16;
  drawText(`Payment Type: ${sale.paymentType}`, 50, y);

  const bytes = await pdfDoc.save();
  return bytes;
}

