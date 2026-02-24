"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "Users", href: "/admin/tenants" },
  { label: "Accounting", href: "/admin/accounting" },
  { label: "Audit Log", href: "/admin/audit" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border px-6 py-2">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent",
            pathname.startsWith(item.href)
              ? "bg-terminal/10 text-terminal"
              : "text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
