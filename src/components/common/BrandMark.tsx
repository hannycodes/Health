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
      <img
        src="/logo.svg"
        alt="MyHealth"
        width={36}
        height={36}
        className="size-9 rounded-lg shadow-sm"
      />
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
