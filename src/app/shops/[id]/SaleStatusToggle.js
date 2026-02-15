"use client";

import { useFormStatus } from "react-dom";
import { toggleSaleStatus } from "../../sales/actions";
import { Button } from "../../../components/ui/Button";

function ToggleSubmitButton({ isPaid }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-7 px-2 text-xs"
      disabled={pending}
    >
      {pending ? "..." : isPaid ? "Mark Unpaid" : "Mark Paid"}
    </Button>
  );
}

export function SaleStatusToggle({ saleId, shopId, status }) {
  const isPaid = status === "paid";

  return (
    <form
      action={toggleSaleStatus}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="saleId" value={saleId} />
      {shopId && <input type="hidden" name="shopId" value={shopId} />}
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          isPaid
            ? "bg-green-100 text-green-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {isPaid ? "Paid" : "Unpaid"}
      </span>
      <ToggleSubmitButton isPaid={isPaid} />
    </form>
  );
}
