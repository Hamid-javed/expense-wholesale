import { connectToDatabase } from "../../lib/db";
import { Staff } from "../../models/Staff";
import { RouteModel } from "../../models/Route";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import Link from "next/link";
import { createStaff, toggleStaffActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await connectToDatabase();
  const [staffRaw, routesRaw] = await Promise.all([
    Staff.find({ deletedAt: null }).sort({ createdAt: -1 }).lean(),
    RouteModel.find({ deletedAt: null }).sort({ name: 1 }).lean(),
  ]);

  // Serialize ObjectIds to strings for form handling
  const staff = staffRaw.map((s) => ({
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
        title="Staff"
        description="Manage sales staff, routes, and their status."
      />
      <Card>
        <CardBody>
          <form
            action={createStaff}
            className="mb-4 flex flex-wrap gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs md:text-sm"
          >
            <Input
              label="Name"
              name="name"
              required
              className="w-40 md:w-48"
              placeholder="Staff name"
            />
            <Input
              label="Phone"
              name="phone"
              className="w-40 md:w-48"
              placeholder="Optional"
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
              <Button type="submit">Add Staff</Button>
            </div>
          </form>

          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Staff ID</TH>
                <TH>Route</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {staff.map((s) => {
                const route = routes.find((r) => r._id === s.routeId);
                return (
                  <TR key={s._id}>
                    <TD>
                      <Link
                        href={`/staff/${s._id}/sales`}
                        className="font-medium text-slate-800 hover:text-slate-900 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TD>
                    <TD className="text-slate-600">{s.phone}</TD>
                    <TD className="font-mono text-xs text-slate-700">
                      {s.staffId}
                    </TD>
                    <TD>{route?.name || "-"}</TD>
                    <TD>
                      <form action={toggleStaffActive}>
                        <input type="hidden" name="id" value={s._id} />
                        <Button
                          type="submit"
                          variant={s.isActive ? "outline" : "ghost"}
                          className="h-7 px-2 text-xs"
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </Button>
                      </form>
                    </TD>
                    <TD className="text-right">
                      <Link href={`/staff/${s._id}/sales`}>
                        <Button variant="outline" className="h-7 px-2 text-xs">
                          View Sales
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

