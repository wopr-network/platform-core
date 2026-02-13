"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Channels", href: "/channels" },
  { label: "Plugins", href: "/plugins" },
  { label: "Instances", href: "/instances" },
  { label: "Fleet Health", href: "/fleet/health" },
  { label: "Billing", href: "/billing/plans" },
  { label: "Settings", href: "/settings/profile" },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/settings/profile") return pathname.startsWith("/settings");
  if (href === "/billing/plans") return pathname.startsWith("/billing");
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <span className="text-lg font-semibold tracking-tight">WOPR</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isNavActive(item.href, pathname)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4">
        <div className="text-xs text-muted-foreground">Sign in</div>
      </div>
    </aside>
  );
}
