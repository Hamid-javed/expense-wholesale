import { connectToDatabase } from "../../lib/db";
import { Sale } from "../../models/Sale";
import Link from "next/link";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import {
  getTodayPK,
  getStartOfTodayPK,
  getStartOfMonthPK,
  getStartOfDayPK,
  getEndOfDayPK,
  formatDatePK,
  getStartOfMonthFor,
  getEndOfMonthFor,
} from "../../lib/dateUtils";
import { INVOICE_PREFIX } from "../../lib/config";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }) {
  const [, search] = await Promise.all([
    connectToDatabase(),
    searchParams,
  ]);
  const todayStr = getTodayPK();
  const period =
    search?.period === "monthly"
      ? "monthly"
      : search?.period === "all"
        ? "all"
        : "daily";
  const selectedDateStr =
    typeof search?.date === "string" && search.date.length > 0
      ? search.date
      : todayStr;
  const currentMonthStr = todayStr.slice(0, 7);
  const selectedMonthStr =
    typeof search?.month === "string" && search.month.length > 0
      ? search.month
      : currentMonthStr;

  const startOfToday = getStartOfTodayPK();
  const startOfMonth = getStartOfMonthPK();
  const startOfDay = getStartOfDayPK(selectedDateStr);
  const endOfDay = getEndOfDayPK(selectedDateStr);
  const monthStart = getStartOfMonthFor(selectedMonthStr);
  const monthEnd = getEndOfMonthFor(selectedMonthStr);

  const [
    totalSalesAgg,
    todaySalesAgg,
    monthSalesAgg,
    totalCashAgg,
    totalCreditAgg,
    filteredSales,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          date: { $gte: startOfToday },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Sale.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$cashCollected" } } },
    ]),
    Sale.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$creditRemaining" } } },
    ]),
    Sale.find(
      period === "all"
        ? { deletedAt: null }
        : {
          deletedAt: null,
          date:
            period === "daily"
              ? { $gte: startOfDay, $lte: endOfDay }
              : { $gte: monthStart, $lte: monthEnd },
        }
    )
      .populate("shopId", "name")
      .populate("staffId", "name")
      .sort({ date: -1 })
      .lean(),
  ]);

  const totalSale = totalSalesAgg[0]?.total || 0;
  const todaySale = todaySalesAgg[0]?.total || 0;
  const monthlySale = monthSalesAgg[0]?.total || 0;
  const totalCashCollected = totalCashAgg[0]?.total || 0;
  const totalOutstandingCredit = totalCreditAgg[0]?.total || 0;

  const formatAmount = (n) =>
    (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  function getStatusDisplay(sale) {
    return { text: sale.status === "paid" ? "Paid" : "Unpaid" };
  }

  const monthLabel =
    period === "monthly"
      ? (() => {
        const [y, m] = selectedMonthStr.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        return formatDatePK(d, { month: "long", year: "numeric" });
      })()
      : null;
  const listingTitle =
    period === "all"
      ? "Sales Listing - All time"
      : period === "daily"
        ? `Sales Listing - ${selectedDateStr === todayStr ? "Today" : selectedDateStr}`
        : `Sales Listing - ${monthLabel}`;
  const exportHref =
    period === "daily"
      ? `/api/reports/sales?date=${encodeURIComponent(selectedDateStr)}`
      : `/api/reports/sales?month=${encodeURIComponent(selectedMonthStr)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales summaries and invoice listing."
        actions={
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Report period">
            <Link
              href="/reports?period=all"
              role="tab"
              aria-selected={period === "all"}
              aria-current={period === "all" ? "page" : undefined}
              className={period === "all" ? "inline-block ring-2 ring-slate-600 ring-offset-2 rounded-md" : undefined}
            >
              <Button
                type="button"
                variant={period === "all" ? "primary" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
              >
                {period === "all" ? "All time ✓" : "All time"}
              </Button>
            </Link>
            <Link
              href={
                period === "daily"
                  ? `/reports?period=daily&date=${selectedDateStr}`
                  : `/reports?period=daily&date=${selectedMonthStr}-01`
              }
              role="tab"
              aria-selected={period === "daily"}
              aria-current={period === "daily" ? "page" : undefined}
              className={period === "daily" ? "inline-block ring-2 ring-slate-600 ring-offset-2 rounded-md" : undefined}
            >
              <Button
                type="button"
                variant={period === "daily" ? "primary" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
              >
                {period === "daily" ? "Daily ✓" : "Daily"}
              </Button>
            </Link>
            <Link
              href={
                period === "monthly"
                  ? `/reports?period=monthly&month=${selectedMonthStr}`
                  : `/reports?period=monthly&month=${selectedDateStr.slice(0, 7)}`
              }
              role="tab"
              aria-selected={period === "monthly"}
              aria-current={period === "monthly" ? "page" : undefined}
              className={period === "monthly" ? "inline-block ring-2 ring-slate-600 ring-offset-2 rounded-md" : undefined}
            >
              <Button
                type="button"
                variant={period === "monthly" ? "primary" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
              >
                {period === "monthly" ? "Monthly ✓" : "Monthly"}
              </Button>
            </Link>
            {period === "daily" ? (
              <form className="flex flex-wrap items-center gap-2" method="GET">
                <input type="hidden" name="period" value="daily" />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>Date</span>
                  <input
                    type="date"
                    name="date"
                    defaultValue={selectedDateStr}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </label>
                <Button type="submit" variant="outline" className="h-8 px-3 text-xs">
                  Filter
                </Button>
              </form>
            ) : period === "monthly" ? (
              <form className="flex flex-wrap items-center gap-2" method="GET">
                <input type="hidden" name="period" value="monthly" />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>Month</span>
                  <input
                    type="month"
                    name="month"
                    defaultValue={selectedMonthStr}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </label>
                <Button type="submit" variant="outline" className="h-8 px-3 text-xs">
                  Filter
                </Button>
              </form>
            ) : null}
            {period !== "all" && (
              <a
                href={exportHref}
                download
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Export to Excel
              </a>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Total Sale" />
          <CardBody>
            <div className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {formatAmount(totalSale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">All time</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly Sale" />
          <CardBody>
            <div className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {formatAmount(monthlySale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">This month</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Today Sale" />
          <CardBody>
            <div className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {formatAmount(todaySale)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {selectedDateStr === todayStr ? "Today" : selectedDateStr}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Total Cash Collected" />
          <CardBody>
            <div className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {formatAmount(totalCashCollected)}
            </div>
            <p className="mt-1 text-xs text-slate-500">All shops</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Total Outstanding Credit" />
          <CardBody>
            <div className="text-xl font-semibold text-amber-700 sm:text-2xl">
              {formatAmount(totalOutstandingCredit)}
            </div>
            <p className="mt-1 text-xs text-slate-500">All shops</p>
          </CardBody>
        </Card>
      </div>

      {/* Sales Listing */}
      <Card>
        <CardHeader
          title={listingTitle}
          description={`${filteredSales.length} invoice${filteredSales.length !== 1 ? "s" : ""}`}
        />
        <CardBody>
          {filteredSales.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              {period === "all"
                ? "No sales found."
                : period === "daily"
                  ? "No sales found for this date."
                  : "No sales found for this month."}
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Invoice #</TH>
                  <TH>Date</TH>
                  <TH>Shop</TH>
                  <TH>Staff</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Cash</TH>
                  <TH className="text-right">Credit</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filteredSales.map((sale) => {
                  const statusDisplay = getStatusDisplay(sale);
                  return (
                    <TR key={sale._id.toString()}>
                      <TD className="font-mono text-xs">
                        {INVOICE_PREFIX}
                        {sale.invoiceId}
                      </TD>
                      <TD className="text-slate-600">
                        {formatDatePK(sale.date, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TD>
                      <TD>{sale.shopId?.name || "-"}</TD>
                      <TD>{sale.staffId?.name || "-"}</TD>
                      <TD className="text-right font-medium">
                        {formatAmount(sale.totalAmount)}
                      </TD>
                      <TD className="text-right text-slate-600">
                        {formatAmount(sale.cashCollected)}
                      </TD>
                      <TD className="text-right text-slate-600">
                        {formatAmount(sale.creditRemaining)}
                      </TD>
                      <TD>{statusDisplay.text}</TD>
                    </TR>
                  );
                })}
                <TR className="border-t-2 border-slate-200 bg-slate-50 font-semibold w-full">
                  <TD colSpan={4} className="text-left text-slate-700">
                    Subtotal
                  </TD>
                  <TD className="text-left text-slate-900">
                    {formatAmount(
                      filteredSales.reduce(
                        (sum, s) => sum + (s.totalAmount ?? 0),
                        0
                      )
                    )}
                  </TD>
                  <TD className="text-right text-slate-700">
                    Collected:
                    {formatAmount(
                      filteredSales.reduce(
                        (sum, s) => sum + (s.cashCollected ?? 0),
                        0
                      )
                    )}
                  </TD>
                  <TD className="text-right text-slate-700">
                    Remaining:
                    {formatAmount(
                      filteredSales.reduce(
                        (sum, s) => sum + (s.creditRemaining ?? 0),
                        0
                      )
                    )}
                  </TD>
                  <TD></TD>
                </TR>
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
