import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function HospitalNotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notifications = useServiceQuery(
    () => (userId ? services.notifications.listForUser(userId) : Promise.resolve([])),
    userId,
  );

  const all = notifications.data ?? [];
  const unreadCount = all.filter((item) => !item.isRead).length;
  const rows = unreadOnly ? all.filter((item) => !item.isRead) : all;

  async function markRead(id: string) {
    try {
      await services.notifications.markRead(id);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function markAllRead() {
    try {
      await services.notifications.markAllRead(userId);
      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Appointments, doctors, departments and payment events for your hospital."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Notifications" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setUnreadOnly((value) => !value)}
              aria-pressed={unreadOnly}
            >
              {unreadOnly ? "Show all" : `Unread only (${unreadCount})`}
            </Button>
            <Button onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="size-4" />
              Mark all read
            </Button>
          </>
        }
      />

      {!userId ? (
        <ErrorState title="No session" message="Sign in again to view notifications." />
      ) : notifications.isLoading ? (
        <ListSkeleton rows={3} />
      ) : notifications.error ? (
        <ErrorState message={notifications.error} onRetry={notifications.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="Hospital activity will appear here as it happens."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-border divide-y">
              {rows.map((notification) => (
                <li
                  key={notification.id}
                  className={
                    notification.isRead ? "px-5 py-4" : "bg-muted/30 px-5 py-4"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={
                          notification.isRead
                            ? "bg-border mt-1.5 size-2 shrink-0 rounded-full"
                            : "bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                        }
                        aria-hidden="true"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <Badge variant="outline">{notification.type}</Badge>
                          {!notification.isRead && (
                            <span className="text-primary text-[11px] font-medium">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {notification.message}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {notification.link && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={notification.link}>Open</Link>
                        </Button>
                      )}
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void markRead(notification.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
