"use client";

import clsx from "clsx";

export function Input({ label, error, className, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label && <span>{label}</span>}
      <input
        className={clsx(
          "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

