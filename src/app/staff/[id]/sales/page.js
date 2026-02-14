import { connectToDatabase } from "../../../../lib/db";
import { Staff } from "../../../../models/Staff";
import { Sale } from "../../../../models/Sale";
import "../../../../models/Product"; // Register Product for Sale.populate("items.productId")
import { DailySalesSummary } from "../../../../models/DailySalesSummary";
import { RouteModel } from "../../../../models/Route";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../../../components/ui/Table";
import Link from "next/link";
import { Button } from "../../../../components/ui/Button";
import { DailySummaryForm } from "./DailySummaryForm";
import { QuantityEditor } from "./QuantityEditor";
import { InvoiceDownloadPrompt } from "./InvoiceDownloadPrompt";
import { getTodayPK, getStartOfDayPK, getEndOfDayPK, getDateKeyPK, formatDatePK, parseDatePK } from "../../../../lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function StaffSalesPage({ params, searchParams }) {
  await connectToDatabase();
  const { id } = await params;

  const search = await searchParams;
  const todayStr = getTodayPK(); // Get today in PK timezone
  const selectedDateStr =
    typeof search?.date === "string" && search.date.length > 0
      ? search.date
      : todayStr;

  const startOfDay = getStartOfDayPK(selectedDateStr);
  const endOfDay = getEndOfDayPK(selectedDateStr);

  const staff = await Staff.findById(id).lean();
  if (!staff) {
    return (
      <div className="space-y-4">
        <PageHeader title="Staff Not Found" />
        <Card>
          <CardBody>
            <p className="text-slate-600">The requested staff member could not be found.</p>
            <Link href="/staff">
              <Button variant="outline" className="mt-4">
                Back to Staff
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Fetch sales for this staff member on the selected date
  const sales = await Sale.find({
    staffId: id,
    deletedAt: null,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate("shopId", "name phone ownerName")
    .populate("items.productId", "name sku unit")
    .sort({ date: -1 })
    .lean();

  // Fetch ALL daily summaries for this staff to calculate totals
  const allDailySummaries = await DailySalesSummary.find({
    staffId: id,
    deletedAt: null,
  })
    .lean();

  // Group sales by date using PK timezone
  const salesByDate = {};
  sales.forEach((sale) => {
    const dateKey = getDateKeyPK(sale.date);
    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = [];
    }
    salesByDate[dateKey].push(sale);
  });

  // Create a map of daily summaries by date string using PK timezone
  const summariesByDate = {};
  allDailySummaries.forEach((summary) => {
    const dateKey = getDateKeyPK(summary.date);
    summariesByDate[dateKey] = summary;
  });

  // Calculate totals from daily summaries (not from individual sales)
  const totalCash = allDailySummaries.reduce(
    (sum, s) => sum + (s.cashSales || 0),
    0
  );
  const totalCredit = allDailySummaries.reduce(
    (sum, s) => sum + (s.creditSales || 0),
    0
  );
  const totalSales = totalCash + totalCredit;

  // Calculate total cash per shop for the selected date only
  const salesForSelectedDate = await Sale.find({
    staffId: id,
    deletedAt: null,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate("shopId", "name")
    .lean();

  const cashByShop = {};
  let selectedDateTotalSales = 0;
  let selectedDateCashSales = 0;
  let selectedDateCreditSales = 0;
  let selectedDateShopCount = 0;

  salesForSelectedDate.forEach((sale) => {
    if (!sale.shopId) return;
    const shopId = sale.shopId._id?.toString() || sale.shopId.toString();
    const shopName = sale.shopId.name || "Unknown Shop";

    if (!cashByShop[shopId]) {
      cashByShop[shopId] = {
        name: shopName,
        totalCash: 0,
        totalAmount: 0,
      };
      selectedDateShopCount++;
    }

    if (sale.paymentType === "cash") {
      cashByShop[shopId].totalCash += sale.totalAmount || 0;
      selectedDateCashSales += sale.totalAmount || 0;
    } else if (sale.paymentType === "credit") {
      selectedDateCreditSales += sale.totalAmount || 0;
    }
    cashByShop[shopId].totalAmount += sale.totalAmount || 0;
    selectedDateTotalSales += sale.totalAmount || 0;
  });

  // Calculate today's sales (if selected date is not today)
  let todayTotalSales = 0;
  let todayCashSales = 0;
  let todayCreditSales = 0;
  let todaySales = [];

  if (selectedDateStr !== todayStr) {
    const todayStartOfDay = getStartOfDayPK(todayStr);
    const todayEndOfDay = getEndOfDayPK(todayStr);

    todaySales = await Sale.find({
      staffId: id,
      deletedAt: null,
      date: {
        $gte: todayStartOfDay,
        $lte: todayEndOfDay,
      },
    }).lean();

    todayTotalSales = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    todayCashSales = todaySales
      .filter((s) => s.paymentType === "cash")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    todayCreditSales = todaySales
      .filter((s) => s.paymentType === "credit")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }

  const route = staff.routeId
    ? await RouteModel.findById(staff.routeId).lean()
    : null;

  const sortedDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales: ${staff.name}`}
        description={`Staff ID: ${staff.staffId || "N/A"} | Route: ${route?.name || "Unassigned"
          }`}
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
            <Link href="/staff">
              <Button variant="ghost" className="h-8 px-3 text-xs">
                ← Back to Staff
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Total Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalSales.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Cash Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalCash.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Credit Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalCredit.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Total Days" />
          <CardBody>
            <div className="text-2xl font-semibold">{sortedDates.length}</div>
          </CardBody>
        </Card>
      </div>

      {/* Sales Summary for Selected Date */}
      {Object.keys(cashByShop).length > 0 && (
        <Card>
          <CardHeader
            title={`Sales Summary - ${selectedDateStr === todayStr ? "Today" : selectedDateStr}`}
            actions={
              <a
                href={`/api/invoices/combined/${id}?date=${selectedDateStr}`}
                target="_blank"
              >
                <Button variant="outline" className="h-8 px-3 text-xs">
                  Download Combined Invoice
                </Button>
              </a>
            }
          />
          <CardBody>
            <div className="mb-6">
              <div className="bg-slate-50 p-6 rounded-lg inline-block">
                <div className="text-sm text-slate-600 mb-2">Total Sales ({selectedDateStr === todayStr ? "Today" : selectedDateStr})</div>
                <div className="text-3xl font-semibold text-slate-900">
                  {selectedDateTotalSales.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                Sales by Shop
              </h4>
              <Table>
                <THead>
                  <TR>
                    <TH>Shop Name</TH>
                    <TH className="text-right">Total Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {Object.values(cashByShop)
                    .sort((a, b) => b.totalAmount - a.totalAmount)
                    .map((shop) => (
                      <TR key={shop.name}>
                        <TD>{shop.name}</TD>
                        <TD className="text-right font-medium">
                          {shop.totalAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Today's Sales Summary (if not already shown) */}
      {/* {selectedDateStr !== todayStr && (
        <Card>
          <CardHeader title="Today's Sales" />
          <CardBody>
            <div className="bg-slate-50 p-6 rounded-lg inline-block">
              <div className="text-sm text-slate-600 mb-2">Total Sales (Today)</div>
              <div className="text-3xl font-semibold text-slate-900">
                {todayTotalSales.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      )} */}

      {/* Daily Summary Input for Selected Date (if no sales for this date) */}
      {/* {!salesByDate[selectedDateStr] && (
        <Card>
          <CardHeader title="Daily Sales Summary" />
          <CardBody>
            <p className="text-sm text-slate-600 mb-3">
              No sales records for {selectedDateStr}. You can still enter daily cash and credit sales totals.
            </p>
            <DailySummaryForm
              staffId={id.toString()}
              date={selectedDateStr}
              cashSales={summariesByDate[selectedDateStr]?.cashSales || 0}
              creditSales={summariesByDate[selectedDateStr]?.creditSales || 0}
            />
          </CardBody>
        </Card>
      )} */}

      {/* Sales grouped by date */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-slate-500 py-8">
              No sales records found for this staff member on the selected date.
            </p>
          </CardBody>
        </Card>
      ) : (
        sortedDates.map((dateKey) => {
          const dateSales = salesByDate[dateKey];
          const dateSummary = summariesByDate[dateKey];
          const dateCash = dateSummary?.cashSales || 0;
          const dateCredit = dateSummary?.creditSales || 0;
          const dateTotal = dateCash + dateCredit;
          const dateObj = parseDatePK(dateKey);

          return (
            <Card key={dateKey}>
              <CardHeader
                title={formatDatePK(dateObj, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                actions={
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-slate-700">
                      Cash: {dateCash.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      Credit: {dateCredit.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Total: {dateTotal.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                }
              />
              <CardBody>
                <div className="space-y-4">
                  {/* Daily Summary Input for this date */}
                  <div className="mb-4 pb-4 border-b border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Daily Sales Summary
                    </h4>
                    <DailySummaryForm
                      staffId={id.toString()}
                      date={dateKey}
                      cashSales={dateCash}
                      creditSales={dateCredit}
                    />
                  </div>
                  {dateSales.map((sale) => {
                    const shop = sale.shopId;
                    return (
                      <div
                        key={sale._id.toString()}
                        className="border-l-4 border-slate-300 pl-4"
                      >
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {shop?.name || "Unknown Shop"}
                            </h3>
                            {shop?.phone && (
                              <p className="text-xs text-slate-500">
                                {shop.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">
                              Invoice: {sale.invoiceId}
                            </div>
                            <div className="text-xs text-slate-500 capitalize">
                              {sale.paymentType}
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              {sale.totalAmount.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <InvoiceDownloadPrompt saleId={sale._id.toString()} />
                          </div>
                        </div>
                        <Table>
                          <THead>
                            <TR>
                              <TH>Product</TH>
                              <TH>SKU</TH>
                              <TH className="text-right">Quantity</TH>
                              <TH className="text-right">Unit Price</TH>
                              <TH className="text-right">Line Total</TH>
                            </TR>
                          </THead>
                          <TBody>
                            {sale.items.map((item, idx) => {
                              const product = item.productId;
                              return (
                                <TR key={idx}>
                                  <TD>{product?.name || "Unknown"}</TD>
                                  <TD className="text-slate-600 text-xs">
                                    {product?.sku || "-"}
                                  </TD>
                                  <TD className="text-right">
                                    <QuantityEditor
                                      saleId={sale._id.toString()}
                                      itemIndex={idx}
                                      currentQuantity={item.quantity}
                                      unit={product?.unit || ""}
                                    />
                                  </TD>
                                  <TD className="text-right">
                                    {item.price.toFixed(2)}
                                  </TD>
                                  <TD className="text-right font-medium">
                                    {item.lineTotal.toFixed(2)}
                                  </TD>
                                </TR>
                              );
                            })}
                          </TBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
