import { connectToDatabase } from "../../lib/db";
import { Sale } from "../../models/Sale";
import { ReturnModel } from "../../models/Return";
import { Shop } from "../../models/Shop";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { getStartOfTodayPK, getStartOfMonthPK } from "../../lib/dateUtils";

export const dynamic = "force-dynamic";

async function exportDailyReport() {
  "use server";
  // Placeholder for Excel export API usage; implement streaming if needed.
}

export default async function ReportsPage() {
  await connectToDatabase();

  const startOfToday = getStartOfTodayPK();
  const startOfMonth = getStartOfMonthPK();

  const [todaySalesAgg, monthSalesAgg, returnsAgg, creditAgg] =
    await Promise.all([
      Sale.aggregate([
        { $match: { date: { $gte: startOfToday }, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: startOfMonth }, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      ReturnModel.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, totalQty: { $sum: "$quantity" } } },
      ]),
      Shop.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$currentCredit" } } },
      ]),
    ]);

  const dailySales = todaySalesAgg[0]?.total || 0;
  const monthlySales = monthSalesAgg[0]?.total || 0;
  const totalReturnsQty = returnsAgg[0]?.totalQty || 0;
  const outstandingCredit = creditAgg[0]?.total || 0;

  const netEarnings = monthlySales; // refine: subtract returns etc.

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Exports"
        description="Daily and monthly summaries with export options."
        actions={
          <form action={exportDailyReport}>
            <Button type="submit" variant="outline" className="text-xs">
              Export daily report (Excel)
            </Button>
          </form>
        }
      />

      <Card>
        <CardBody>
          <Table>
            <THead>
              <TR>
                <TH>Metric</TH>
                <TH className="text-right">Value</TH>
              </TR>
            </THead>
            <TBody>
              <TR>
                <TD>Today&apos;s sales</TD>
                <TD className="text-right">
                  {dailySales.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </TD>
              </TR>
              <TR>
                <TD>Monthly sales</TD>
                <TD className="text-right">
                  {monthlySales.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </TD>
              </TR>
              <TR>
                <TD>Total returns (qty)</TD>
                <TD className="text-right">
                  {totalReturnsQty.toLocaleString()}
                </TD>
              </TR>
              <TR>
                <TD>Outstanding credit</TD>
                <TD className="text-right">
                  {outstandingCredit.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </TD>
              </TR>
              <TR>
                <TD>Net earnings (monthly, simple)</TD>
                <TD className="text-right">
                  {netEarnings.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </TD>
              </TR>
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

