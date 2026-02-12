"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { upsertDailySalesSummary } from "./actions";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-8 px-3 text-xs"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export function DailySummaryForm({ staffId, date, cashSales = 0, creditSales = 0 }) {
  const router = useRouter();
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setError(null); // Clear previous error
    const result = await upsertDailySalesSummary(formData);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to save daily summary");
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
      <div className="flex items-end gap-3">
        <input type="hidden" name="staffId" value={staffId} />
        <input type="hidden" name="date" value={date} />
        <Input
          label="Cash Sales"
          name="cashSales"
          type="number"
          step="0.01"
          min="0"
          defaultValue={cashSales}
          className="w-32"
        />
        <Input
          label="Credit Sales"
          name="creditSales"
          type="number"
          step="0.01"
          min="0"
          defaultValue={creditSales}
          className="w-32"
        />
        <SubmitButton />
      </div>
      {error && (
        <div className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}
    </form>
  );
}
