import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { NotificationList } from "@/components/doctor/NotificationList";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function DoctorNotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const notifications = useServiceQuery(
    () => (userId ? services.notifications.listForUser(userId) : Promise.resolve([])),
    userId,
  );

  const unread = (notifications.data ?? []).filter((item) => !item.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread notification(s) about your patients.`
            : "Appointment activity and system messages about your patients."
        }
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Notifications" }]}
      />

      {notifications.isLoading ? (
        <ListSkeleton rows={3} />
      ) : notifications.error ? (
        <ErrorState
          message={notifications.error}
          onRetry={() => notifications.refetch()}
        />
      ) : (
        <NotificationList
          notifications={notifications.data ?? []}
          userId={userId}
          onChanged={() => notifications.refetch()}
        />
      )}
    </div>
  );
}
