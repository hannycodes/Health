import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          404
        </p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to MyHealth</Link>
      </Button>
    </div>
  );
}
