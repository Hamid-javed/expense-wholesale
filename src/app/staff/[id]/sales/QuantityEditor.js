"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { updateSaleItemQuantity } from "./actions";
import { Button } from "../../../../components/ui/Button";

function SubmitButton({ isEditing, onCancel }) {
  const { pending } = useFormStatus();
  if (!isEditing) return null;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="submit"
        variant="outline"
        className="h-6 px-2 text-xs"
        disabled={pending}
      >
        {pending ? "Saving..." : "Save"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-6 px-2 text-xs"
        onClick={onCancel}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}

export function QuantityEditor({ saleId, itemIndex, currentQuantity, unit }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(currentQuantity.toString());
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setError(null);
    const result = await updateSaleItemQuantity(formData);
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to update quantity");
    }
  }

  function handleCancel() {
    setQuantity(currentQuantity.toString());
    setIsEditing(false);
    setError(null);
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm">
          {currentQuantity} {unit || ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col items-end gap-1">
      <input type="hidden" name="saleId" value={saleId} />
      <input type="hidden" name="itemIndex" value={itemIndex} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="newQuantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
          step="1"
          className="h-7 w-20 rounded border border-slate-300 px-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          autoFocus
        />
        <span className="text-xs text-slate-600">{unit || ""}</span>
        <SubmitButton isEditing={isEditing} onCancel={handleCancel} />
      </div>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </form>
  );
}
