import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/constants";
import { useAuth } from "@/hooks/useAuth";

export function UnauthorizedPage() {
  const { role } = useAuth();
  const home = role ? ROLE_HOME[role] : "/login";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your account does not have permission to open this dashboard. Sign in with a
          account with the right role to continue.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link to={home}>Go to my dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/login">Switch account</Link>
        </Button>
      </div>
    </div>
  );
}
