import { HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg shadow-sm">
        <HeartPulse className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">MyHealth</span>
          <span className="text-muted-foreground text-[11px] font-medium">
            Care navigation
          </span>
        </span>
      )}
    </div>
  );
}
