import { connectToDatabase } from "../../../lib/db";
import { Shop } from "../../../models/Shop";
import { Sale } from "../../../models/Sale";
import { Staff } from "../../../models/Staff";
import { RouteModel } from "../../../models/Route";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../../components/ui/Table";
import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { ShopDayReportPrompt } from "./ShopDayReportPrompt";
import { getTodayPK, getStartOfDayPK, getEndOfDayPK, getDateKeyPK, formatDatePK, parseDatePK } from "../../../lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function ShopDetailPage({ params, searchParams }) {
  await connectToDatabase();
  const { id } = await params;

  const search = await searchParams;
  const todayStr = getTodayPK();
  const selectedDateStr =
    typeof search?.date === "string" && search.date.length > 0
      ? search.date
      : todayStr;

  const shop = await Shop.findById(id).lean();
  if (!shop) {
    return (
      <div className="space-y-4">
        <PageHeader title="Shop Not Found" />
        <Card>
          <CardBody>
            <p className="text-slate-600">The requested shop could not be found.</p>
            <Link href="/shops">
              <Button variant="outline" className="mt-4">
                Back to Shops
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Fetch sales for the selected date only
  const startOfDay = getStartOfDayPK(selectedDateStr);
  const endOfDay = getEndOfDayPK(selectedDateStr);

  const allSales = await Sale.find({
    shopId: id,
    deletedAt: null,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate("staffId", "name staffId")
    .populate("items.productId", "name sku unit")
    .sort({ date: -1 })
    .lean();

  // Group sales by date
  const salesByDate = {};
  allSales.forEach((sale) => {
    const dateKey = getDateKeyPK(sale.date);
    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = [];
    }
    salesByDate[dateKey].push(sale);
  });

  // Calculate totals
  const totalSales = allSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCashSales = allSales
    .filter((s) => s.paymentType === "cash")
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCreditSales = allSales
    .filter((s) => s.paymentType === "credit")
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // Get route info if shop has route
  const route = shop.routeId
    ? await RouteModel.findById(shop.routeId).populate("assignedStaff").lean()
    : null;

  const sortedDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

  // Get unique staff members who have made sales to this shop
  const staffIds = [...new Set(allSales.map((s) => s.staffId?._id?.toString() || s.staffId?.toString()).filter(Boolean))];
  const staffMembers = await Staff.find({
    _id: { $in: staffIds },
  }).lean();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Shop: ${shop.name}`}
        description={
          <div className="space-y-1">
            {shop.ownerName && <div>Owner: {shop.ownerName}</div>}
            {shop.phone && <div>Phone: {shop.phone}</div>}
            {route && <div>Route: {route.name}</div>}
          </div>
        }
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
            <Link href="/shops">
              <Button variant="ghost" className="h-8 px-3 text-xs">
                ← Back to Shops
              </Button>
            </Link>
          </div>
        }
      />

      {/* Shop Info & Summary Cards */}
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
              {totalCashSales.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Credit Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalCreditSales.toLocaleString(undefined, {
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

      {/* Staff Information */}
      {staffMembers.length > 0 && (
        <Card>
          <CardHeader title="Staff Members" />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staffMembers.map((staff) => {
                const staffSales = allSales.filter(
                  (s) => (s.staffId?._id?.toString() || s.staffId?.toString()) === staff._id.toString()
                );
                const staffTotal = staffSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
                return (
                  <div key={staff._id.toString()} className="bg-slate-50 p-4 rounded-lg">
                    <div className="font-semibold text-slate-900">{staff.name}</div>
                    {staff.staffId && (
                      <div className="text-xs text-slate-600">ID: {staff.staffId}</div>
                    )}
                    <div className="text-sm text-slate-700 mt-2">
                      Total Sales: {staffTotal.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {staffSales.length} invoice{staffSales.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sales grouped by date */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-slate-500 py-8">
              No sales records found for this shop.
            </p>
          </CardBody>
        </Card>
      ) : (
        sortedDates.map((dateKey) => {
          const dateSales = salesByDate[dateKey];
          const dateTotal = dateSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
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
                    <span className="text-sm font-semibold text-slate-900">
                      Total: {dateTotal.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <ShopDayReportPrompt shopId={id} reportDate={dateKey} />
                  </div>
                }
              />
              <CardBody>
                <div className="space-y-4">
                  {dateSales.map((sale) => {
                    const staff = sale.staffId;
                    return (
                      <div
                        key={sale._id.toString()}
                        className="border-l-4 border-slate-300 pl-4"
                      >
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              Invoice: {sale.invoiceId}
                            </h3>
                            {staff && (
                              <p className="text-xs text-slate-500">
                                Staff: {staff.name} {staff.staffId ? `(${staff.staffId})` : ""}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500 capitalize">
                              {sale.paymentType}
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              {sale.totalAmount.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </div>
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
                                    {item.quantity} {product?.unit || ""}
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
