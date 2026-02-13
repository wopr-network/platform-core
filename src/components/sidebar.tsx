"use client";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Channels", href: "/channels" },
  { label: "Plugins", href: "/plugins" },
  { label: "Instances", href: "/instances" },
  { label: "Fleet Health", href: "/fleet/health" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <span className="text-lg font-semibold tracking-tight">WOPR</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4">
        <div className="text-xs text-muted-foreground">Sign in</div>
      </div>
    </aside>
  );
}
