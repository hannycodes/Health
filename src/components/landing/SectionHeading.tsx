import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  className?: string;
  tone?: "light" | "dark";
}

/** Shared eyebrow + title + description pattern for landing sections. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  tone = "light",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.16em] uppercase",
            tone === "dark" ? "text-emerald-300" : "text-brand",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-display text-3xl leading-[1.15] font-bold text-balance sm:text-4xl",
          tone === "dark" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-[15px] leading-relaxed",
            tone === "dark" ? "text-white/70" : "text-ink-muted",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
