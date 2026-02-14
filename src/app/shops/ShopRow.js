"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormStatus } from "react-dom";
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

export function ShopRow({ shop, routes, updateShop, toggleShopActive }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: shop.name,
    ownerName: shop.ownerName || "",
    phone: shop.phone || "",
    cnic: shop.cnic || "",
    currentCredit: shop.currentCredit || 0,
    routeId: shop.routeId || "",
  });

  async function handleUpdate(formData) {
    setIsSubmitting(true);
    try {
      const result = await updateShop(formData);
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
      name: shop.name,
      ownerName: shop.ownerName || "",
      phone: shop.phone || "",
      cnic: shop.cnic || "",
      currentCredit: shop.currentCredit || 0,
      routeId: shop.routeId || "",
    });
    setIsEditing(false);
  }

  const route = routes.find((r) => r._id === shop.routeId);

  if (!isEditing) {
    return (
      <TR>
        <TD>{shop.name}</TD>
        <TD className="text-slate-600">{shop.ownerName || "-"}</TD>
        <TD className="text-slate-600">{shop.phone || "-"}</TD>
        <TD className="text-slate-600 font-mono text-xs">{shop.cnic || "-"}</TD>
        <TD className="text-right">
          {Number(shop.currentCredit || 0).toFixed(2)}
        </TD>
        <TD>{route?.name || "-"}</TD>
        <TD>
          <div className="flex items-center gap-2">
            <Link href={`/shops/${shop._id}`}>
              <Button
                type="button"
                variant="outline"
                className="h-7 px-2 text-xs"
              >
                View
              </Button>
            </Link>
            <form action={toggleShopActive}>
              <input type="hidden" name="id" value={shop._id} />
              <Button
                type="submit"
                variant={shop.isActive ? "outline" : "ghost"}
                className="h-7 px-2 text-xs"
              >
                {shop.isActive ? "Active" : "Disabled"}
              </Button>
            </form>
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

  const formId = `shop-form-${shop._id}`;
  
  return (
    <TR>
      <TD>
        <form id={formId} action={handleUpdate}>
          <input type="hidden" name="id" value={shop._id} />
        </form>
        <Input
          form={formId}
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
          className="w-32"
        />
      </TD>
      <TD>
        <Input
          form={formId}
          name="ownerName"
          value={formData.ownerName}
          onChange={(e) =>
            setFormData({ ...formData, ownerName: e.target.value })
          }
          className="w-28"
        />
      </TD>
      <TD>
        <Input
          form={formId}
          name="phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
          className="w-24"
        />
      </TD>
      <TD>
        <Input
          form={formId}
          name="cnic"
          value={formData.cnic}
          onChange={(e) =>
            setFormData({ ...formData, cnic: e.target.value })
          }
          className="w-28"
          placeholder="CNIC"
        />
      </TD>
      <TD className="text-right">
        <Input
          form={formId}
          name="currentCredit"
          type="number"
          min="0"
          step="0.01"
          value={formData.currentCredit}
          onChange={(e) =>
            setFormData({ ...formData, currentCredit: e.target.value })
          }
          className="w-24"
        />
      </TD>
      <TD>
        <select
          form={formId}
          name="routeId"
          value={formData.routeId}
          onChange={(e) =>
            setFormData({ ...formData, routeId: e.target.value })
          }
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
      <TD>
        <form id={formId} action={handleUpdate}>
          <input type="hidden" name="id" value={shop._id} />
        </form>
        <SubmitButton onCancel={handleCancel} formId={formId} isSubmitting={isSubmitting} />
      </TD>
    </TR>
  );
}
