"use client";

import clsx from "clsx";

export function Card({ className, children }) {
  return (
    <div
      className={clsx(
        "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions }) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {description && (
          <p className="mt-1 truncate text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function CardBody({ children, className }) {
  return <div className={clsx("text-sm", className)}>{children}</div>;
}

