import { Card, CardContent } from "@/components/ui/card";

export function ByokCallout({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        All plans are BYOK — you pay your AI provider directly. WOPR never touches your inference.
      </p>
    );
  }

  return (
    <Card className="border-emerald-500/25 bg-emerald-500/5">
      <CardContent className="flex items-start gap-3 py-4">
        <span className="mt-0.5 text-lg" aria-hidden="true">
          *
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Bring Your Own Keys</p>
          <p className="text-sm text-muted-foreground">
            All plans are BYOK — you pay your AI provider directly. WOPR never touches your
            inference. We only charge for the orchestration layer: containers, plugins, and support.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
