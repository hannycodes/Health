import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { Notification } from "@/types";
import { formatDateTime } from "@/utils/format";

interface NotificationListProps {
  notifications: Notification[];
  userId: string;
  onChanged: () => void;
}

export function NotificationList({ notifications, userId, onChanged }: NotificationListProps) {
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible =
    filter === "UNREAD"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;
  const unread = notifications.filter((notification) => !notification.isRead).length;

  async function markRead(id: string) {
    setBusyId(id);
    try {
      await services.notifications.markRead(id);
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    try {
      await services.notifications.markAllRead(userId);
      toast.success("All notifications marked as read.");
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "ALL" | "UNREAD")}>
          <TabsList aria-label="Filter notifications">
            <TabsTrigger value="ALL">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="UNREAD">Unread ({unread})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void markAllRead()}
          disabled={unread === 0}
        >
          <CheckCheck className="size-4" />
          Mark all as read
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
          description="Appointment activity and system messages for you appear here."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y px-0">
            {visible.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
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
                      <Badge variant="outline">{notification.type.toLowerCase()}</Badge>
                      {!notification.isRead && <Badge>Unread</Badge>}
                    </div>
                    <p className="text-muted-foreground text-sm">{notification.message}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {notification.link && (
                    <Button variant="outline" size="sm" asChild>
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
                      disabled={busyId === notification.id}
                      onClick={() => void markRead(notification.id)}
                    >
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
