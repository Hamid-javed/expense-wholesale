import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { Sale } from "../../../../models/Sale";
import { getStartOfDayPK, getEndOfDayPK } from "../../../../lib/dateUtils";
import { formatDatePK } from "../../../../lib/dateUtils";
import { INVOICE_PREFIX } from "../../../../lib/config";
import * as XLSX from "xlsx";

export async function GET(req) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json(
      { error: "Date is required" },
      { status: 400 }
    );
  }

  const startOfDay = getStartOfDayPK(dateStr);
  const endOfDay = getEndOfDayPK(dateStr);

  const sales = await Sale.find({
    deletedAt: null,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate("shopId", "name")
    .populate("staffId", "name")
    .sort({ date: -1 })
    .lean();

  const rows = [
    ["Invoice #", "Date", "Shop", "Staff", "Amount"],
    ...sales.map((sale) => [
      `${INVOICE_PREFIX}${sale.invoiceId}`,
      formatDatePK(sale.date, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      sale.shopId?.name || "-",
      sale.staffId?.name || "-",
      sale.totalAmount ?? 0,
    ]),
  ];

  const subtotal = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  rows.push(["", "", "", "Subtotal", subtotal]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `sales-report-${dateStr}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
