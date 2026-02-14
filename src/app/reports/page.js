import { connectToDatabase } from "../../lib/db";
import { Sale } from "../../models/Sale";
import { Shop } from "../../models/Shop";
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
} from "../../lib/dateUtils";
import { INVOICE_PREFIX } from "../../lib/config";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }) {
  await connectToDatabase();

  const search = await searchParams;
  const todayStr = getTodayPK();
  const selectedDateStr =
    typeof search?.date === "string" && search.date.length > 0
      ? search.date
      : todayStr;

  const startOfToday = getStartOfTodayPK();
  const startOfMonth = getStartOfMonthPK();
  const startOfDay = getStartOfDayPK(selectedDateStr);
  const endOfDay = getEndOfDayPK(selectedDateStr);

  const [
    totalSalesAgg,
    todaySalesAgg,
    monthSalesAgg,
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
    Shop.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$currentCredit" } } },
    ]),
    Sale.find({
      deletedAt: null,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("shopId", "name")
      .populate("staffId", "name")
      .sort({ date: -1 })
      .lean(),
  ]);

  const totalSale = totalSalesAgg[0]?.total || 0;
  const todaySale = todaySalesAgg[0]?.total || 0;
  const monthlySale = monthSalesAgg[0]?.total || 0;
  const totalCredit = totalCreditAgg[0]?.total || 0;

  const formatAmount = (n) =>
    (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales summaries and invoice listing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex flex-wrap items-center gap-2" method="GET">
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
            <a
              href={`/api/reports/sales?date=${encodeURIComponent(selectedDateStr)}`}
              download
              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Export to Excel
            </a>
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
          <CardHeader title="Total Credit (Loan)" />
          <CardBody>
            <div className="text-xl font-semibold text-amber-700 sm:text-2xl">
              {formatAmount(totalCredit)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Sum of Current Credit (all shops)</p>
          </CardBody>
        </Card>
      </div>

      {/* Sales Listing */}
      <Card>
        <CardHeader
          title={`Sales Listing - ${selectedDateStr === todayStr ? "Today" : selectedDateStr}`}
          description={`${filteredSales.length} invoice${filteredSales.length !== 1 ? "s" : ""}`}
        />
        <CardBody>
          {filteredSales.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No sales found for this date.
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
                </TR>
              </THead>
              <TBody>
                {filteredSales.map((sale) => (
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
                  </TR>
                ))}
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
                </TR>
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
