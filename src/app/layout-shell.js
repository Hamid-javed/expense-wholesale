"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/staff", label: "Staff" },
  { href: "/shops", label: "Shops" },
  { href: "/routes", label: "Routes" },
  { href: "/sales", label: "Sales" },
  { href: "/reports", label: "Reports" },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex h-14 items-center justify-between gap-4 border-b bg-white px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileNavOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            Expense & Sales Manager
          </h1>
        </div>
        <form action="/logout" method="POST" className="shrink-0">
          <button
            type="submit"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-white px-3 py-4 md:block">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center rounded-md px-3 py-2 hover:bg-slate-200 hover:text-black",
                  pathname === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-700"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
        )}
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white shadow-lg transition-transform duration-200 ease-out md:hidden",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-end border-b px-4 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="space-y-1 p-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={clsx(
                  "flex items-center rounded-md px-3 py-2 hover:bg-slate-200 hover:text-black",
                  pathname === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-700"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
