import type { DemoDatabase } from "@/data/database";
import type { Notification, NotificationType } from "@/types";
import { createId } from "./utils";

/** Append a notification to the shared demo store. */
export function pushNotification(
  db: DemoDatabase,
  input: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
  },
): Notification {
  const notification: Notification = {
    id: createId("ntf"),
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    isRead: false,
    createdAt: new Date().toISOString(),
    link: input.link,
  };

  db.notifications = [notification, ...db.notifications];
  return notification;
}
