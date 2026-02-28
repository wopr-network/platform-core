"use client";

import { Badge } from "@/components/ui/badge";
import { useCapabilityMeta } from "@/hooks/use-capability-meta";

/**
 * Renders a capability label from the registry. Falls back to auto-formatted name.
 */
export function CapabilityLabel({ capability }: { capability: string }) {
  const { getMeta } = useCapabilityMeta();
  const meta = getMeta(capability);
  return <span>{meta.label}</span>;
}

/**
 * Renders the pricing badge for a capability. Returns null if no pricing info.
 */
export function CapabilityPricing({ capability }: { capability: string }) {
  const { getMeta } = useCapabilityMeta();
  const meta = getMeta(capability);
  if (!meta.pricing) return null;
  return <Badge variant="outline">{meta.pricing}</Badge>;
}

/**
 * Renders the description for a capability. Returns null if no description.
 */
export function CapabilityDescription({ capability }: { capability: string }) {
  const { getMeta } = useCapabilityMeta();
  const meta = getMeta(capability);
  if (!meta.description) return null;
  return <p className="text-sm text-muted-foreground">{meta.description}</p>;
}
