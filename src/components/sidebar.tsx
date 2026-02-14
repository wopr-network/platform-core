"use client";

import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/marketplace" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Channels", href: "/channels" },
  { label: "Plugins", href: "/plugins" },
  { label: "Instances", href: "/instances" },
  { label: "Fleet Health", href: "/fleet/health" },
  { label: "Billing", href: "/billing/plans" },
  { label: "Settings", href: "/settings/profile" },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/marketplace") return pathname === "/marketplace";
  if (href === "/settings/profile") return pathname.startsWith("/settings");
  if (href === "/billing/plans") return pathname.startsWith("/billing");
  return pathname.startsWith(href);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const user = session?.user;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

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
      <div className="border-t border-sidebar-border px-3 py-3">
        {isPending ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User avatar"}
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
                  {user.name?.trim() ? getInitials(user.name) : <UserIcon className="size-4" />}
                </span>
              )}
              <span className="truncate">{user.name ?? user.email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  {user.name && <span className="text-sm font-medium">{user.name}</span>}
                  {user.email && (
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <UserIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/providers")}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/login"
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
