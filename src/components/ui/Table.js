"use client";

import clsx from "clsx";

export function Table({ children, className }) {
  return (
    <div className={clsx("overflow-x-auto rounded-lg border", className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function TR({ children, className }) {
  return <tr className={clsx("hover:bg-slate-50", className)}>{children}</tr>;
}

export function TH({ children, className }) {
  return (
    <th
      scope="col"
      className={clsx("px-2 py-2 text-left font-medium sm:px-3", className)}
    >
      {children}
    </th>
  );
}

export function TD({ children, className }) {
  return (
    <td
      className={clsx(
        "whitespace-nowrap px-2 py-2 align-middle sm:px-3",
        className
      )}
    >
      {children}
    </td>
  );
}

