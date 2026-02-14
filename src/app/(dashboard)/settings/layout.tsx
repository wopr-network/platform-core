"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Account", href: "/settings/account" },
  { label: "Provider Keys", href: "/settings/providers" },
  { label: "API Keys", href: "/settings/api-keys" },
  { label: "Organization", href: "/settings/org" },
];

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <nav className="w-48 shrink-0 border-r p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Settings</h2>
        <ul className="space-y-1">
          {settingsNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
