"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TR, TD } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

function SubmitButton({ onCancel, formId, isSubmitting }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="submit"
        form={formId}
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
    </div>
  );
}

export function StaffRow({ staff, routes, updateStaff, toggleStaffActive }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: staff.name,
    phone: staff.phone || "",
    cnic: staff.cnic || "",
    routeId: staff.routeId || "",
  });

  async function handleUpdate(formDataPayload) {
    setIsSubmitting(true);
    try {
      const result = await updateStaff(formDataPayload);
      if (!result?.error) {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setFormData({
      name: staff.name,
      phone: staff.phone || "",
      cnic: staff.cnic || "",
      routeId: staff.routeId || "",
    });
    setIsEditing(false);
  }

  const route = routes.find((r) => r._id === staff.routeId);

  if (!isEditing) {
    return (
      <TR>
        <TD>
          <Link
            href={`/staff/${staff._id}/sales`}
            className="font-medium text-slate-800 hover:text-slate-900 hover:underline"
          >
            {staff.name}
          </Link>
        </TD>
        <TD className="text-slate-600">{staff.phone || "-"}</TD>
        <TD className="text-slate-600 font-mono text-xs">{staff.cnic || "-"}</TD>
        <TD className="font-mono text-xs text-slate-700">{staff.staffId}</TD>
        <TD>{route?.name || "-"}</TD>
        <TD>
          <form action={toggleStaffActive}>
            <input type="hidden" name="id" value={staff._id} />
            <Button
              type="submit"
              variant={staff.isActive ? "outline" : "ghost"}
              className="h-7 px-2 text-xs"
            >
              {staff.isActive ? "Active" : "Inactive"}
            </Button>
          </form>
        </TD>
        <TD>
          <div className="flex items-center gap-2">
            <Link href={`/staff/${staff._id}/sales`}>
              <Button variant="outline" className="h-7 px-2 text-xs">
                View Sales
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </div>
        </TD>
      </TR>
    );
  }

  const formId = `staff-form-${staff._id}`;

  return (
    <TR>
      <TD>
        <form id={formId} action={handleUpdate}>
          <input type="hidden" name="id" value={staff._id} />
        </form>
        <Input
          form={formId}
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-32"
        />
      </TD>
      <TD>
        <Input
          form={formId}
          name="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-28"
        />
      </TD>
      <TD>
        <Input
          form={formId}
          name="cnic"
          value={formData.cnic}
          onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
          className="w-28"
          placeholder="CNIC"
        />
      </TD>
      <TD className="font-mono text-xs text-slate-700">{staff.staffId}</TD>
      <TD>
        <select
          form={formId}
          name="routeId"
          value={formData.routeId}
          onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
          className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Unassigned</option>
          {routes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
      </TD>
      <TD>-</TD>
      <TD>
        <SubmitButton
          onCancel={handleCancel}
          formId={formId}
          isSubmitting={isSubmitting}
        />
      </TD>
    </TR>
  );
}
