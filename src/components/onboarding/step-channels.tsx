"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { channelPlugins } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

interface StepChannelsProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function StepChannels({ selected, onToggle }: StepChannelsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Pick your channels</h2>
        <p className="mt-2 text-muted-foreground">
          Select one or more messaging platforms to connect.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {channelPlugins.map((channel) => {
          const isSelected = selected.includes(channel.id);
          return (
            <button
              key={channel.id}
              type="button"
              className="text-left"
              onClick={() => onToggle(channel.id)}
            >
              <Card
                className={cn(
                  "h-full cursor-pointer transition-all hover:shadow-md",
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/30",
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: channel.color }}
                    >
                      {channel.name[0]}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">{channel.name}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {channel.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isSelected && <p className="mt-2 text-xs font-medium text-primary">Selected</p>}
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
