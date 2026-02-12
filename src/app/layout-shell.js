"use client";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex h-16 items-center border-b bg-white px-6 shadow-sm">
        <div className="text-lg font-semibold tracking-tight">
          Expense & Sales Manager
        </div>
      </div>
      <div className="flex">
        <aside className="hidden w-56 border-r bg-white px-3 py-4 md:block">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center rounded-md px-3 py-2 hover:bg-slate-100",
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
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

