"use client";

import clsx from "clsx";

export function Button({ children, variant = "primary", className, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-900",
    outline:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      className={clsx(base, variants[variant], className)}
      type={props.type || "button"}
      {...props}
    >
      {children}
    </button>
  );
}

