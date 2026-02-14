"use client";

import { useState } from "react";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { PAYMENT_TYPES } from "../../lib/config";

export function SalesForm({ staff, shops, products, createSale }) {
  const [rows, setRows] = useState([
    { productId: "", quantity: "", price: "" },
  ]);
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]);
  const [formError, setFormError] = useState(null);

  const addRow = () => {
    setRows((prev) => [...prev, { productId: "", quantity: "", price: "" }]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const onChangeRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const computedRows = rows.map((row) => {
    const qty = Number(row.quantity || 0);
    const price = Number(
      row.price ||
        (products.find((p) => p._id === row.productId)?.price ?? 0)
    );
    return { ...row, quantity: row.quantity, price, lineTotal: qty * price };
  });

  const grandTotal = computedRows.reduce(
    (sum, r) => sum + (Number(r.lineTotal) || 0),
    0
  );

  const getAvailable = (productId) => {
    const p = products.find((x) => x._id === productId);
    return p != null ? (p.quantity ?? 0) : null;
  };

  const getRowError = (row) => {
    if (!row.productId) return null;
    const qtyStr = String(row.quantity ?? "").trim();
    const qty = Number(qtyStr);
    // Only show "must be greater than zero" when user entered something invalid (0 or negative), not when field is empty
    if (qtyStr !== "" && (isNaN(qty) || qty <= 0)) {
      return "Quantity must be greater than zero.";
    }
    if (qtyStr !== "" && !isNaN(qty) && qty > 0) {
      const available = getAvailable(row.productId);
      if (available != null && qty > available) {
        return `Only ${available} available.`;
      }
    }
    return null;
  };

  const hasRowErrors = computedRows.some((row) => row.productId && getRowError(row));

  return (
    <form
      action={async (formData) => {
        setFormError(null);
        formData.set("paymentType", paymentType);
        formData.set("itemCount", String(computedRows.length));
        computedRows.forEach((row, index) => {
          formData.set(`items[${index}][productId]`, row.productId);
          formData.set(`items[${index}][quantity]`, String(row.quantity || 0));
          formData.set(`items[${index}][price]`, String(row.price || 0));
        });

        const result = await createSale(formData);
        if (result?.error) {
          setFormError(result.error);
          return;
        }
        setRows([{ productId: "", quantity: "", price: "" }]);
      }}
      className="space-y-4"
    >
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-4 md:text-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span>Staff</span>
          <select
            name="staffId"
            required
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Select staff</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span>Shop</span>
          <select
            name="shopId"
            required
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Select shop</option>
            {shops.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span>Date</span>
          <input
            type="date"
            name="date"
            required
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            defaultValue={(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })()}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span>Payment type</span>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Product</TH>
            <TH className="text-right">Qty</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Line total</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {computedRows.map((row, index) => (
            <TR key={index}>
              <TD>
                <select
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  value={row.productId}
                  onChange={(e) =>
                    onChangeRow(index, "productId", e.target.value)
                  }
                >
                  <option value="">Select product</option>
                  {products && products.length > 0 ? (
                    products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No products available</option>
                  )}
                </select>
              </TD>
              <TD className="text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={`h-8 w-20 rounded-md border px-2 text-right text-xs text-slate-900 shadow-sm outline-none focus:ring-1 focus:ring-slate-500 ${
                      getRowError(row)
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-300 bg-white focus:border-slate-500"
                    }`}
                    value={row.quantity}
                    onChange={(e) =>
                      onChangeRow(index, "quantity", e.target.value)
                    }
                  />
                  {row.productId && (
                    <span className="text-[10px] text-slate-500">
                      Available: {getAvailable(row.productId) ?? 0}
                    </span>
                  )}
                  {getRowError(row) && (
                    <span className="text-[10px] text-red-600">
                      {getRowError(row)}
                    </span>
                  )}
                </div>
              </TD>
              <TD className="text-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 w-24 rounded-md border border-slate-300 bg-white px-2 text-right text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  value={row.price}
                  onChange={(e) =>
                    onChangeRow(index, "price", e.target.value)
                  }
                />
              </TD>
              <TD className="text-right">
                {Number(row.lineTotal || 0).toFixed(2)}
              </TD>
              <TD className="text-right">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </Button>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="flex items-center justify-between text-sm">
        <Button
          type="button"
          variant="outline"
          className="text-xs"
          onClick={addRow}
        >
          Add row
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-600">
            Total items: {rows.length}
          </span>
          <span className="text-sm font-semibold">
            Total: {grandTotal.toFixed(2)}
          </span>
          <Button type="submit" disabled={hasRowErrors}>
            Save sale
          </Button>
        </div>
      </div>
    </form>
  );
}

