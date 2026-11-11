import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function AdminNotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.notifications.listForUser(userId),
    userId,
  );

  const notifications = (data ?? []).filter(
    (notification) => !unreadOnly || !notification.isRead,
  );
  const unreadCount = (data ?? []).filter(
    (notification) => !notification.isRead,
  ).length;

  async function markRead(id: string) {
    await services.notifications.markRead(id);
    refetch();
  }

  async function markAllRead() {
    await services.notifications.markAllRead(userId);
    refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform notifications"
        description="Approval requests, registration events and important platform activity."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Notifications" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        }
      />

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-primary size-4 rounded border"
          checked={unreadOnly}
          onChange={(event) => setUnreadOnly(event.target.checked)}
        />
        Show unread only ({unreadCount})
      </label>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description={
            unreadOnly
              ? "You are up to date."
              : "Platform events will appear here as they happen."
          }
        />
      ) : (
        <Card>
          <CardContent className="divide-y">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-border" : "bg-primary"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <Badge variant="outline">{notification.type}</Badge>
                      {!notification.isRead && (
                        <Badge variant="secondary">Unread</Badge>
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

                <div className="flex shrink-0 gap-2 pl-5 sm:pl-0">
                  {notification.link && (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={notification.link}
                        onClick={() => void markRead(notification.id)}
                      >
                        Open
                      </Link>
                    </Button>
                  )}
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void markRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
