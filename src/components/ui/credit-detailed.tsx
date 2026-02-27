import { formatCreditDetailed } from "@/lib/format-credit";
import { cn } from "@/lib/utils";

interface CreditDetailedProps {
  value: number;
  className?: string;
}

/**
 * Renders a detailed credit value with two-tone typography:
 * - "$X.XX" portion at full opacity (text-foreground)
 * - Sub-cent digits at reduced opacity (text-muted-foreground)
 *
 * For values where detailed === standard (e.g. "$1.23"), the muted
 * portion is empty and the value renders like a normal credit display.
 */
export function CreditDetailed({ value, className }: CreditDetailedProps) {
  const formatted = formatCreditDetailed(value);
  // Split after the first 4 characters: "$X.XX" portion = chars 0-3 (e.g. "$0.00")
  // The precise split point is after index 4 (dollar sign + digit + dot + 2 decimals)
  const splitAt = 5; // "$X.XX" = 5 chars minimum
  const normal = formatted.slice(0, splitAt);
  const muted = formatted.slice(splitAt);

  return (
    <span className={cn("font-mono font-medium", className)}>
      <span>{normal}</span>
      {muted && <span className="text-muted-foreground">{muted}</span>}
    </span>
  );
}
