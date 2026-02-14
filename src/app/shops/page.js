import { connectToDatabase } from "../../lib/db";
import { Shop } from "../../models/Shop";
import { RouteModel } from "../../models/Route";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { Table, THead, TBody, TR, TH } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { createShop, updateShop, toggleShopActive } from "./actions";
import { ShopRow } from "./ShopRow";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  await connectToDatabase();
  const [shopsRaw, routesRaw] = await Promise.all([
    Shop.find({ deletedAt: null }).sort({ createdAt: -1 }).lean(),
    RouteModel.find({ deletedAt: null }).sort({ name: 1 }).lean(),
  ]);

  // Serialize ObjectIds to strings for form handling
  const shops = shopsRaw.map((s) => ({
    ...s,
    _id: s._id.toString(),
    routeId: s.routeId?.toString(),
  }));
  const routes = routesRaw.map((r) => ({
    ...r,
    _id: r._id.toString(),
    assignedStaff: r.assignedStaff?.toString(),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shops"
        description="Manage shops and active status."
      />
      <Card>
        <CardBody>
          <form
            action={createShop}
            className="mb-4 flex flex-wrap gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs md:text-sm"
          >
            <Input
              label="Shop name"
              name="name"
              required
              className="w-44"
              placeholder="Shop name"
            />
            <Input
              label="Owner name"
              name="ownerName"
              className="w-40"
              placeholder="Optional"
            />
            <Input
              label="Phone"
              name="phone"
              className="w-32"
              placeholder="Optional"
            />
            <Input
              label="CNIC"
              name="cnic"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-36"
              placeholder="e.g. 3130302876477"
            />
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              <span>Route</span>
              <select
                name="routeId"
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="">Unassigned</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button type="submit">Add Shop</Button>
            </div>
          </form>

          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Owner</TH>
                <TH>Phone</TH>
                <TH>CNIC</TH>
                <TH className="text-right">Current Credit</TH>
                <TH>Route</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {shops.map((s) => (
                <ShopRow
                  key={s._id}
                  shop={s}
                  routes={routes}
                  updateShop={updateShop}
                  toggleShopActive={toggleShopActive}
                />
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

