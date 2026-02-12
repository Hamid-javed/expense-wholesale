"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { UNITS } from "../../lib/config";

export function ProductsTable({ products, createProduct, updateProduct, toggleProductActive }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);

  async function handleUpdate(formData, productId) {
    const result = await updateProduct(formData);
    if (!result?.error) {
      setEditingId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <form
        action={async (formData) => {
          await createProduct(formData);
          router.refresh();
        }}
        className="flex flex-wrap gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs md:text-sm"
      >
        <Input
          label="Name"
          name="name"
          required
          className="w-40 md:w-48"
          placeholder="Product name"
        />
        <Input
          label="SKU / Code"
          name="sku"
          required
          className="w-32 md:w-40"
          placeholder="Internal code"
        />
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span>Unit</span>
          <select
            name="unit"
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Price / Unit"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          className="w-32"
          placeholder="0.00"
        />
        <Input
          label="Quantity / Stock"
          name="quantity"
          type="number"
          step="1"
          min="0"
          className="w-32"
          placeholder="0"
          defaultValue="0"
        />
        <div className="flex items-end">
          <Button type="submit">Add Product</Button>
        </div>
      </form>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>SKU</TH>
            <TH>Unit</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Quantity</TH>
            <TH className="text-right">Total Sold</TH>
            <TH className="text-right">Revenue</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {products.map((p) => {
            const isEditing = editingId === p._id;
            const formId = `edit-form-${p._id}`;
            return (
              <TR key={p._id}>
                <TD>
                  {isEditing ? (
                    <>
                      <form id={formId} action={(formData) => handleUpdate(formData, p._id)}>
                        <input type="hidden" name="id" value={p._id} />
                      </form>
                      <Input
                        form={formId}
                        name="name"
                        defaultValue={p.name}
                        className="w-40"
                        required
                      />
                    </>
                  ) : (
                    <span className="font-medium text-slate-800">{p.name}</span>
                  )}
                </TD>
                <TD>
                  {isEditing ? (
                    <Input
                      form={formId}
                      name="sku"
                      defaultValue={p.sku}
                      className="w-32"
                      required
                    />
                  ) : (
                    <span className="text-slate-600">{p.sku}</span>
                  )}
                </TD>
                <TD>
                  {isEditing ? (
                    <select
                      form={formId}
                      name="unit"
                      defaultValue={p.unit}
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-700">{p.unit}</span>
                  )}
                </TD>
                <TD className="text-right">
                  {isEditing ? (
                    <Input
                      form={formId}
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={p.price}
                      className="w-24 text-right"
                      required
                    />
                  ) : (
                    <span>{Number(p.price).toFixed(2)}</span>
                  )}
                </TD>
                <TD className="text-right">
                  {isEditing ? (
                    <Input
                      form={formId}
                      name="quantity"
                      type="number"
                      step="1"
                      min="0"
                      defaultValue={p.quantity || 0}
                      className="w-20 text-right"
                    />
                  ) : (
                    <span className={Number(p.quantity || 0) === 0 ? "text-red-600 font-medium" : "text-slate-700"}>
                      {Number(p.quantity || 0).toLocaleString()}
                    </span>
                  )}
                </TD>
                <TD className="text-right">
                  {Number(p.totalSold || 0).toLocaleString()}
                </TD>
                <TD className="text-right">
                  {Number(p.totalRevenue || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </TD>
                <TD>
                  <form
                    action={async (formData) => {
                      await toggleProductActive(formData);
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="id" value={p._id} />
                    <Button
                      type="submit"
                      variant={p.isActive ? "outline" : "ghost"}
                      className="h-7 px-2 text-xs"
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </Button>
                  </form>
                </TD>
                <TD className="text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="submit"
                        form={formId}
                        variant="outline"
                        className="h-7 px-2 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditingId(p._id)}
                    >
                      Edit
                    </Button>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
