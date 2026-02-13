"use client";

import { Button } from "@/components/ui/button";

interface StepDoneProps {
  onGoToDashboard: () => void;
  onCreateAnother: () => void;
}

export function StepDone({ onGoToDashboard, onCreateAnother }: StepDoneProps) {
  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl text-green-500">
          +
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Your WOPR is live!</h2>
        <p className="mt-2 text-muted-foreground">
          Your instance is running and ready to go. Head to the dashboard to manage it.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={onGoToDashboard}>
          Go to Dashboard
        </Button>
        <Button variant="ghost" onClick={onCreateAnother}>
          Create another WOPR
        </Button>
      </div>
    </div>
  );
}
