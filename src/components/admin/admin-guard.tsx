"use client";

import { ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "platform_admin") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <ShieldAlert className="size-12 text-red-500" />
        <p className="text-lg font-bold uppercase tracking-widest text-red-500">ACCESS DENIED</p>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
