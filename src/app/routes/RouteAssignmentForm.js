"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "../../components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-7 px-2 text-xs"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export function RouteAssignmentForm({ routeId, assignedStaffId, staff, assignStaffToRoute }) {
  const router = useRouter();
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setError(null);
    const result = await assignStaffToRoute(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success || !result?.error) {
      setError(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <form
        action={handleSubmit}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="routeId" value={routeId} />
        <select
          name="staffId"
          defaultValue={assignedStaffId || ""}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <SubmitButton />
      </form>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
