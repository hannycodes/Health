import { Link } from "react-router-dom";

import logoImage from "@/components/images/logo.png";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-7",
  sm: "h-9",
  md: "h-11",
  lg: "h-14",
  xl: "h-16",
} as const;

type LogoSize = keyof typeof SIZES;

interface LogoProps {
  /** Rendered height of the official logo. Width scales automatically. */
  size?: LogoSize;
  /** Router path for the clickable logo. Pass `null` to render it static. */
  to?: string | null;
  /** Wrap the logo in a light container when placed on a dark surface. */
  onDark?: boolean;
  className?: string;
  imgClassName?: string;
}

/**
 * The official MyHealth logo.
 *
 * Always renders the supplied `logo.png` at its native 2:1 proportions — never
 * redrawn, recoloured or cropped. On dark surfaces the white-background asset
 * is placed inside a light container, as the logo is not a transparent mark.
 */
export function Logo({
  size = "md",
  to = "/",
  onDark = false,
  className,
  imgClassName,
}: LogoProps) {
  const image = (
    <img
      src={logoImage}
      alt="MyHealth"
      width={1774}
      height={887}
      className={cn(
        "w-auto object-contain",
        SIZES[size],
        onDark && "rounded-lg bg-white p-1.5",
        imgClassName,
      )}
    />
  );

  if (!to) {
    return <span className={cn("inline-flex items-center", className)}>{image}</span>;
  }

  return (
    <Link
      to={to}
      aria-label="MyHealth home"
      className={cn(
        "inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {image}
    </Link>
  );
}
