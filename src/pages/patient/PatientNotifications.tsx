import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function PatientNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.notifications.listForUser(userId),
    userId,
  );

  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.isRead).length;

  async function markRead(id: string, link?: string) {
    try {
      await services.notifications.markRead(id);
      if (link) navigate(link);
    } catch (readError) {
      toast.error(getApiErrorMessage(readError));
    }
  }

  async function markAllRead() {
    try {
      await services.notifications.markAllRead(userId);
      toast.success("All notifications marked as read.");
    } catch (readError) {
      toast.error(getApiErrorMessage(readError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Appointment updates, record changes and reminders."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Notifications" }]}
        actions={
          notifications.length > 0 ? (
            <Button
              variant="outline"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {notifications.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"}`
            : "All caught up"}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Appointment confirmations, reminders and record updates will appear here."
        />
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y px-0">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between",
                  !notification.isRead && "bg-primary/[0.03]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      notification.isRead ? "bg-border" : "bg-primary",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {notification.title}
                      <Badge variant="outline" className="text-[10px]">
                        {notification.type}
                      </Badge>
                      <span className="sr-only">
                        {notification.isRead ? "Read" : "Unread"}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm">{notification.message}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5 pl-4 sm:pl-0">
                  {notification.link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void markRead(notification.id, notification.link)}
                    >
                      Open
                    </Button>
                  )}
                  {!notification.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void markRead(notification.id)}
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
