import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-72" />
          </div>
          <div className="rounded-sm border p-6 space-y-4">
            {Array.from({ length: 3 }, (_, n) => `sk-${n}`).map((skId) => (
              <div key={skId} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
