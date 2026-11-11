import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function NotificationsMenu({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data } = useServiceQuery(
    () => services.notifications.listForUser(userId),
    userId,
  );

  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.isRead).length;

  async function openNotification(id: string, link?: string) {
    await services.notifications.markRead(id);
    if (link) navigate(link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="bg-primary absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 gap-1 text-xs"
              onClick={() => void services.notifications.markAllRead(userId)}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              No notifications yet.
            </p>
          ) : (
            notifications.slice(0, 8).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification.id, notification.link)}
                className="hover:bg-accent block w-full border-b px-3 py-2.5 text-left last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      notification.isRead ? "bg-border" : "bg-primary"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {notification.message}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
