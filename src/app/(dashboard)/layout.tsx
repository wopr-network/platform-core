"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { SuspensionBanner } from "@/components/billing/suspension-banner";
import { OnboardingGate } from "@/components/onboarding";
import { Sidebar, SidebarContent } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useWebMCP } from "@/hooks/use-webmcp";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useWebMCP();

  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Auto-close sheet on navigation — pathname dep is intentional
  // biome-ignore lint/correctness/useExhaustiveDependencies: close sheet when pathname changes
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  return (
    <OnboardingGate>
      {/* Desktop layout - hidden on mobile with CSS */}
      <div className="hidden lg:flex h-screen">
        <Sidebar />
        <div className="crt-scanlines flex flex-1 flex-col overflow-auto">
          <SuspensionBanner />
          <EmailVerificationBanner />
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 overflow-auto"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile layout - hidden on desktop with CSS */}
      <div className="crt-scanlines flex lg:hidden h-screen flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4 gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 bg-sidebar text-sidebar-foreground p-0"
              aria-label="Navigation"
            >
              <SidebarContent onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-lg font-semibold tracking-tight">WOPR Bot</span>
        </header>
        <SuspensionBanner />
        <EmailVerificationBanner />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 overflow-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </OnboardingGate>
  );
}
