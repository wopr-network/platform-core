"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const billingNav = [
  { label: "Plans", href: "/billing/plans" },
  { label: "Credits", href: "/billing/credits" },
  { label: "Usage", href: "/billing/usage" },
  { label: "Payment", href: "/billing/payment" },
];

export default function BillingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <nav className="w-48 shrink-0 border-r p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Billing</h2>
        <ul className="space-y-1">
          {billingNav.map((item) => (
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
      <div className="flex-1 overflow-auto p-6">
        {children}
        <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          <div className="flex gap-4">
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
