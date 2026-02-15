import { connectToDatabase } from "../../../lib/db";
import { Shop } from "../../../models/Shop";
import { Sale } from "../../../models/Sale";
import { Product } from "../../../models/Product";
import { Staff } from "../../../models/Staff";
import { RouteModel } from "../../../models/Route";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../../components/ui/Table";
import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { ShopDayReportPrompt } from "./ShopDayReportPrompt";
import { SaleStatusToggle } from "./SaleStatusToggle";
import { SaleCashCreditForm } from "./SaleCashCreditForm";
import { INVOICE_PREFIX } from "../../../lib/config";
import {
  getTodayPK,
  getStartOfDayPK,
  getEndOfDayPK,
  getDateKeyPK,
  formatDatePK,
  parseDatePK,
} from "../../../lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function ShopDetailPage({ params, searchParams }) {
  await connectToDatabase();
  const { id } = await params;

  const search = await searchParams;
  const todayStr = getTodayPK();
  const dateRange = search?.range === "date" ? "date" : "all";
  const selectedDateStr =
    typeof search?.date === "string" && search.date.length > 0
      ? search.date
      : todayStr;
  const saleIdParam = typeof search?.saleId === "string" ? search.saleId.trim() : null;

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

  const startOfDay = getStartOfDayPK(selectedDateStr);
  const endOfDay = getEndOfDayPK(selectedDateStr);
  const listUrl =
    dateRange === "date"
      ? `/shops/${id}?range=date&date=${encodeURIComponent(selectedDateStr)}`
      : `/shops/${id}?range=all`;

  // Single sale detail view
  if (saleIdParam) {
    const sale = await Sale.findOne({
      _id: saleIdParam,
      shopId: id,
      deletedAt: null,
    })
      .populate("staffId", "name staffId")
      .populate("items.productId", "name sku unit")
      .lean();

    if (!sale) {
      return (
        <div className="space-y-6">
          <PageHeader
            title={`Shop: ${shop.name}`}
            actions={
              <Link href={listUrl}>
                <Button variant="outline" className="h-8 px-3 text-xs">
                  ← Back to list
                </Button>
              </Link>
            }
          />
          <Card>
            <CardBody>
              <p className="text-center text-slate-500 py-8">
                Sale not found or does not belong to this shop.
              </p>
            </CardBody>
          </Card>
        </div>
      );
    }

    const staff = sale.staffId;
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Shop: ${shop.name}`}
          description="Invoice detail"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href={listUrl}>
                <Button variant="outline" className="h-8 px-3 text-xs">
                  ← Back to list
                </Button>
              </Link>
              <Link href="/shops">
                <Button variant="ghost" className="h-8 px-3 text-xs">
                  Back to Shops
                </Button>
              </Link>
            </div>
          }
        />
        <Card>
          <CardBody>
            <div className="border-l-4 border-slate-300 pl-4">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Invoice: {INVOICE_PREFIX}{sale.invoiceId}
                  </h3>
                  {staff && (
                    <p className="text-xs text-slate-500">
                      Staff: {staff.name} {staff.staffId ? `(${staff.staffId})` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SaleStatusToggle
                    saleId={sale._id.toString()}
                    shopId={id}
                    status={sale.status || "unpaid"}
                  />
                  <div className="text-xs text-slate-500 capitalize">
                    {sale.paymentType}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {sale.totalAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-slate-600">
                    Cash: {(sale.cashCollected ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} · Credit: {(sale.creditRemaining ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <SaleCashCreditForm
                saleId={sale._id.toString()}
                shopId={id}
                totalAmount={sale.totalAmount}
                cashCollected={sale.cashCollected ?? 0}
                creditRemaining={sale.creditRemaining ?? 0}
              />
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
          </CardBody>
        </Card>
      </div>
    );
  }

  // Listing view: sales for shop (all time or by date)
  const saleFilter =
    dateRange === "date"
      ? { shopId: id, deletedAt: null, date: { $gte: startOfDay, $lte: endOfDay } }
      : { shopId: id, deletedAt: null };
  const allSales = await Sale.find(saleFilter)
    .populate("staffId", "name staffId")
    .sort({ date: -1 })
    .lean();

  const salesByDate = {};
  allSales.forEach((sale) => {
    const dateKey = getDateKeyPK(sale.date);
    if (!salesByDate[dateKey]) salesByDate[dateKey] = [];
    salesByDate[dateKey].push(sale);
  });

  const totalSales = allSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCash = allSales.reduce((sum, s) => sum + (s.cashCollected ?? 0), 0);
  const totalCredit = allSales.reduce((sum, s) => sum + (s.creditRemaining ?? 0), 0);

  const route = shop.routeId
    ? await RouteModel.findById(shop.routeId).populate("assignedStaff").lean()
    : null;

  const sortedDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

  const staffIds = [
    ...new Set(
      allSales
        .map((s) => s.staffId?._id?.toString() || s.staffId?.toString())
        .filter(Boolean)
    ),
  ];
  const staffMembers =
    staffIds.length > 0
      ? await Staff.find({ _id: { $in: staffIds } }).lean()
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Shop: ${shop.name}`}
        description={
          <div className="space-y-1">
            {shop.ownerName && <div>Owner: {shop.ownerName}</div>}
            {shop.phone && <div>Phone: {shop.phone}</div>}
            {shop.cnic && <div>CNIC: {shop.cnic}</div>}
            {route && <div>Route: {route.name}</div>}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Invoice range">
            <Link
              href={`/shops/${id}?range=all`}
              role="tab"
              aria-selected={dateRange === "all"}
              aria-current={dateRange === "all" ? "page" : undefined}
              className={dateRange === "all" ? "inline-block ring-2 ring-slate-600 ring-offset-2 rounded-md" : undefined}
            >
              <Button
                type="button"
                variant={dateRange === "all" ? "primary" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
              >
                {dateRange === "all" ? "All time ✓" : "All time"}
              </Button>
            </Link>
            <Link
              href={dateRange === "date" ? `/shops/${id}?range=date&date=${selectedDateStr}` : `/shops/${id}?range=date&date=${todayStr}`}
              role="tab"
              aria-selected={dateRange === "date"}
              aria-current={dateRange === "date" ? "page" : undefined}
              className={dateRange === "date" ? "inline-block ring-2 ring-slate-600 ring-offset-2 rounded-md" : undefined}
            >
              <Button
                type="button"
                variant={dateRange === "date" ? "primary" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
              >
                {dateRange === "date" ? "By date ✓" : "By date"}
              </Button>
            </Link>
            {dateRange === "date" && (
              <form className="flex flex-wrap items-center gap-2" method="GET">
                <input type="hidden" name="range" value="date" />
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
            )}
            <Link href="/shops">
              <Button variant="ghost" className="h-8 px-3 text-xs">
                ← Back to Shops
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
          <CardHeader title="Total Cash" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalCash.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Total Credit" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {totalCredit.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={dateRange === "date" ? "Total Days" : "Invoices"} />
          <CardBody>
            <div className="text-2xl font-semibold">
              {dateRange === "date" ? sortedDates.length : allSales.length}
            </div>
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
                  (s) =>
                    (s.staffId?._id?.toString() || s.staffId?.toString()) ===
                    staff._id.toString()
                );
                const staffTotal = staffSales.reduce(
                  (sum, s) => sum + (s.totalAmount || 0),
                  0
                );
                return (
                  <div
                    key={staff._id.toString()}
                    className="rounded-lg bg-slate-50 p-4"
                  >
                    <div className="font-semibold text-slate-900">{staff.name}</div>
                    {staff.staffId && (
                      <div className="text-xs text-slate-600">
                        ID: {staff.staffId}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-slate-700">
                      Total Sales:{" "}
                      {staffTotal.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {staffSales.length} invoice
                      {staffSales.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sales listing */}
      <Card>
        <CardHeader
          title={
            dateRange === "all"
              ? "All invoices"
              : `Sales - ${selectedDateStr === todayStr ? "Today" : selectedDateStr}`
          }
          description={`${allSales.length} invoice${allSales.length !== 1 ? "s" : ""}`}
          actions={
            dateRange === "date" ? (
              <ShopDayReportPrompt shopId={id} reportDate={selectedDateStr} />
            ) : null
          }
        />
        <CardBody>
          {allSales.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              {dateRange === "date"
                ? "No sales for this shop on the selected date."
                : "No sales for this shop."}
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Invoice #</TH>
                  <TH>Date</TH>
                  <TH>Staff</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Cash</TH>
                  <TH className="text-right">Credit</TH>
                  <TH>Status</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {allSales.map((sale) => (
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
                    <TD>
                      {sale.staffId?.name || "-"}
                      {sale.staffId?.staffId
                        ? ` (${sale.staffId.staffId})`
                        : ""}
                    </TD>
                    <TD className="text-right font-medium">
                      {(sale.totalAmount ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </TD>
                    <TD className="text-right text-slate-600">
                      {(sale.cashCollected ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </TD>
                    <TD className="text-right text-slate-600">
                      {(sale.creditRemaining ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </TD>
                    <TD>
                      <SaleStatusToggle
                        saleId={sale._id.toString()}
                        shopId={id}
                        status={sale.status || "unpaid"}
                      />
                    </TD>
                    <TD>
                      <Link
                        href={
                          dateRange === "all"
                            ? `/shops/${id}?range=all&saleId=${sale._id}`
                            : `/shops/${id}?range=date&date=${encodeURIComponent(selectedDateStr)}&saleId=${sale._id}`
                        }
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                        >
                          View
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                ))}
                {/* <TR className="w-full border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <TD colSpan={3} className="text-left text-slate-700">
                    Subtotal
                  </TD>
                  <TD className="text-left text-slate-900">
                    {totalSales.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TD>
                  <TD className="text-right text-slate-700">
                    {totalCash.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TD>
                  <TD className="text-right text-slate-700">
                    {totalCredit.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TD>
                  <TD colSpan={2}></TD>
                </TR> */}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
