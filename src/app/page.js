import { connectToDatabase } from "../lib/db";
import { Sale } from "../models/Sale";
import { Shop } from "../models/Shop";
import { Product } from "../models/Product";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/layout/PageHeader";
import { getStartOfTodayPK, getStartOfMonthPK } from "../lib/dateUtils";

export const revalidate = 10;

async function getDashboardData() {
  await connectToDatabase();

  const startOfToday = getStartOfTodayPK();
  const startOfMonth = getStartOfMonthPK();

  const [todaySalesAgg, monthSalesAgg, totalCredit, topProducts] =
    await Promise.all([
      Sale.aggregate([
        { $match: { date: { $gte: startOfToday }, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: startOfMonth }, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Shop.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$currentCredit" } } },
      ]),
      Product.find({ deletedAt: null })
        .sort({ totalRevenue: -1 })
        .limit(5)
        .lean(),
    ]);

  return {
    todaySales: todaySalesAgg[0]?.total || 0,
    monthSales: monthSalesAgg[0]?.total || 0,
    outstandingCredit: totalCredit[0]?.total || 0,
    topProducts,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of sales performance, credit, and top products."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Today&apos;s Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {data.todaySales.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly Sales" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {data.monthSales.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Outstanding Credit" />
          <CardBody>
            <div className="text-2xl font-semibold">
              {data.outstandingCredit.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top Products" />
          <CardBody>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No products or sales yet.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.topProducts.map((p) => (
                  <li
                    key={p._id}
                    className="flex items-center justify-between text-slate-700"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-slate-500">
                      {p.totalRevenue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

