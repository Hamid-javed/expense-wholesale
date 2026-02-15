"use client";

import { useFormStatus } from "react-dom";
import { updateSaleCashCredit } from "../../sales/actions";
import { Button } from "../../../components/ui/Button";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="h-8 px-3 text-xs" disabled={pending}>
      {pending ? "Saving..." : "Update"}
    </Button>
  );
}

export function SaleCashCreditForm({
  saleId,
  shopId,
  totalAmount,
  cashCollected = 0,
  creditRemaining = 0,
}) {
  const [error, setError] = useState(null);

  const formatAmount = (n) =>
    (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <form
      action={async (formData) => {
        setError(null);
        formData.set("saleId", saleId);
        if (shopId) formData.set("shopId", shopId);
        const result = await updateSaleCashCredit(formData);
        if (result?.error) {
          setError(result.error);
        }
      }}
      className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <h4 className="mb-3 text-sm font-medium text-slate-700">
        Cash &amp; Credit (invoice total: {formatAmount(totalAmount)})
      </h4>
      <p className="mb-3 text-xs text-slate-500">
        Split this invoice into cash collected and credit remaining. They should not exceed the total.
      </p>
      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Cash collected</span>
          <input
            type="number"
            name="cashCollected"
            min="0"
            step="0.01"
            defaultValue={cashCollected}
            className="h-8 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Credit remaining</span>
          <input
            type="number"
            name="creditRemaining"
            min="0"
            step="0.01"
            defaultValue={creditRemaining}
            className="h-8 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          />
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}
