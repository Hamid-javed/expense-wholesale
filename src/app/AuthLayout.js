"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./layout-shell";

export function AuthLayout({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
