import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";

import { PlatformActivityFeed } from "@/components/admin/PlatformActivityFeed";
import { ReasonDialog } from "@/components/admin/ReasonDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";
import type { AccountStatus } from "@/types";

export function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const key = id ?? "";
  const { user: actor } = useAuth();

  const userQuery = useServiceQuery(
    () => services.users.getById(key),
    key,
  );
  const logsQuery = useServiceQuery(() => services.auditLogs.list(), "audit");

  const account = userQuery.data;
  const activity = (logsQuery.data ?? []).filter(
    (log) => log.entityId === key,
  );
  const isSelf = actor?.id === key;
  const isSuperAdmin = account?.role === "SUPER_ADMIN";
  const canManage = Boolean(account) && !isSelf && !isSuperAdmin;

  async function setStatus(status: AccountStatus, reason?: string) {
    if (!account) return;
    await services.users.setStatus(account.id, status, reason);
    toast.success(`Account status updated to ${status.toLowerCase()}.`);
    userQuery.refetch();
    logsQuery.refetch();
  }

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="User details" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (userQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="User details" />
        <ErrorState message={userQuery.error} onRetry={userQuery.refetch} />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <PageHeader title="User not found" />
        <EmptyState
          title="This account does not exist"
          description="It may have been removed or the link is incorrect."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/users">Back to users</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.fullName}
        description={account.email}
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Users", to: "/admin/users" },
          { label: account.fullName },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs uppercase">User ID</dt>
                <dd className="font-mono text-xs">{account.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Role</dt>
                <dd className="pt-1">
                  <Badge variant="secondary">{ROLE_LABELS[account.role]}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Status</dt>
                <dd className="pt-1">
                  <StatusBadge kind="account" value={account.status ?? "ACTIVE"} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">
                  Registered
                </dt>
                <dd>{formatDate(account.createdAt.slice(0, 10))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Phone</dt>
                <dd>{account.phone ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">
                  Hospital association
                </dt>
                <dd>
                  {account.hospitalName ? (
                    <Link
                      to={`/admin/hospitals/${account.hospitalId}`}
                      className="text-primary hover:underline"
                    >
                      {account.hospitalName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Role management</p>
              <p className="text-muted-foreground text-xs">
                Roles are not changed with an ad-hoc dropdown. Role assignment is
                an authorised, audited backend workflow; this mock environment
                exposes no role-change endpoint, so the role is read-only here.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isSelf && (
              <p className="text-muted-foreground text-sm">
                You cannot change the status of your own account.
              </p>
            )}
            {isSuperAdmin && !isSelf && (
              <p className="text-muted-foreground flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                Super Administrator accounts are provisioned through a secure
                process, not this screen.
              </p>
            )}

            {canManage && (
              <>
                {(account.status ?? "ACTIVE") === "ACTIVE" && (
                  <>
                    <ReasonDialog
                      title="Suspend this account?"
                      description={`${account.fullName} will be signed out and blocked from signing in. Their records are retained.`}
                      confirmLabel="Suspend account"
                      destructive
                      requiresReason
                      trigger={
                        <Button variant="destructive" className="w-full">
                          Suspend account
                        </Button>
                      }
                      onConfirm={(reason) => setStatus("SUSPENDED", reason)}
                    />
                    <ReasonDialog
                      title="Disable this account?"
                      description={`${account.fullName} will lose access until a Super Administrator re-enables the account.`}
                      confirmLabel="Disable account"
                      destructive
                      requiresReason
                      trigger={
                        <Button variant="outline" className="w-full">
                          Disable account
                        </Button>
                      }
                      onConfirm={(reason) => setStatus("DISABLED", reason)}
                    />
                  </>
                )}

                {(account.status ?? "ACTIVE") === "PENDING" && (
                  <ReasonDialog
                    title="Activate this account?"
                    description={`${account.fullName} will be able to sign in immediately after activation.`}
                    confirmLabel="Activate account"
                    trigger={<Button className="w-full">Activate account</Button>}
                    onConfirm={() => setStatus("ACTIVE")}
                  />
                )}

                {((account.status ?? "ACTIVE") === "SUSPENDED" ||
                  (account.status ?? "ACTIVE") === "DISABLED") && (
                  <ReasonDialog
                    title="Reactivate this account?"
                    description={`${account.fullName} will be able to sign in again with their existing credentials.`}
                    confirmLabel="Reactivate account"
                    trigger={<Button className="w-full">Reactivate account</Button>}
                    onConfirm={() => setStatus("ACTIVE")}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4" />
            Account activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <ListSkeleton rows={2} />
          ) : logsQuery.error ? (
            <ErrorState message={logsQuery.error} onRetry={logsQuery.refetch} />
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No administrative activity recorded for this account.
            </p>
          ) : (
            <PlatformActivityFeed logs={activity} limit={6} />
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Clinical records, AI conversations and uploaded images are intentionally
        not shown in platform administration.
      </p>
    </div>
  );
}
