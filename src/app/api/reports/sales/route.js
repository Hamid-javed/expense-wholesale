import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { Sale } from "../../../../models/Sale";
import {
  getStartOfDayPK,
  getEndOfDayPK,
  formatDatePK,
  getStartOfMonthFor,
  getEndOfMonthFor,
} from "../../../../lib/dateUtils";
import { INVOICE_PREFIX } from "../../../../lib/config";
import * as XLSX from "xlsx";

export async function GET(req) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const monthStr = searchParams.get("month");

  if (!dateStr && !monthStr) {
    return NextResponse.json(
      { error: "Either date (YYYY-MM-DD) or month (YYYY-MM) is required" },
      { status: 400 }
    );
  }

  const isMonthly = Boolean(monthStr);
  const rangeStart = isMonthly
    ? getStartOfMonthFor(monthStr)
    : getStartOfDayPK(dateStr);
  const rangeEnd = isMonthly
    ? getEndOfMonthFor(monthStr)
    : getEndOfDayPK(dateStr);

  const sales = await Sale.find({
    deletedAt: null,
    date: { $gte: rangeStart, $lte: rangeEnd },
  })
    .populate("shopId", "name")
    .populate("staffId", "name")
    .sort({ date: -1 })
    .lean();

  function getStatusValue(sale) {
    return sale.status === "paid" ? "Paid" : "Unpaid";
  }

  const rows = [
    ["Invoice #", "Date", "Shop", "Staff", "Amount", "Cash", "Credit", "Status"],
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
      sale.cashCollected ?? 0,
      sale.creditRemaining ?? 0,
      getStatusValue(sale),
    ]),
  ];

  const subtotalAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const subtotalCash = sales.reduce((sum, s) => sum + (s.cashCollected ?? 0), 0);
  const subtotalCredit = sales.reduce((sum, s) => sum + (s.creditRemaining ?? 0), 0);
  rows.push(["", "", "", "Subtotal", subtotalAmount, subtotalCash, subtotalCredit, ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = isMonthly
    ? `sales-report-${monthStr}.xlsx`
    : `sales-report-${dateStr}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
