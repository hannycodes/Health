import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/http";

/**
 * Shown when the backend reports that an account or its hospital is awaiting
 * approval. It never claims approval happened — the status is re-read from the
 * service.
 */
export function AccountPendingPage() {
  const { user, role, status, refreshUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const refreshed = await refreshUser();
      if (!refreshed) {
        toast.error("Your session has ended. Please sign in again.");
        navigate("/login", { replace: true });
        return;
      }
      if ((refreshed.status ?? "ACTIVE") === "ACTIVE") {
        toast.success("Your account is active. You can continue to your dashboard.");
      } else {
        toast.info("Still awaiting approval. Check back shortly.");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSignOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock className="size-5 text-amber-600" aria-hidden="true" />
          Account approval pending
        </CardTitle>
        <CardDescription>
          Some MyHealth accounts need platform approval before their workspace
          opens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isAuthenticated && user ? (
          <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Name</dt>
              <dd className="font-medium">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Email</dt>
              <dd className="truncate">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Role</dt>
              <dd>{role ? ROLE_LABELS[role] : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Status</dt>
              <dd className="pt-1">
                <StatusBadge kind="account" value={status ?? "PENDING"} />
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sign in with the account that is awaiting approval to see its current
            status.
          </p>
        )}

        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          <li>Hospital administrators wait for their hospital to be approved.</li>
          <li>Invited administrators wait for platform provisioning to finish.</li>
          <li>Patients normally have immediate access after registration.</li>
        </ul>

        <div className="flex flex-wrap gap-2">
          {isAuthenticated ? (
            <>
              <Button onClick={() => void handleRefresh()} disabled={isRefreshing}>
                <RefreshCw className="size-4" />
                {isRefreshing ? "Checking…" : "Check status"}
              </Button>
              <Button variant="outline" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          If approval is taking longer than expected, contact platform support at
          support@myhealth.et.
        </p>
      </CardContent>
    </Card>
  );
}
