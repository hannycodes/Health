import { Link } from "react-router-dom";
import { CalendarClock, Lock, Mail, UserRound } from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS, WEEKDAY_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { HOSPITAL_SERVICE_LABELS } from "@/constants";

export function HospitalSettingsPage() {
  const { user, hospitalId = "" } = useAuth();

  const hospital = useServiceQuery(
    () => services.hospitals.getById(hospitalId),
    `hospital:${hospitalId}`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital settings"
        description="Hospital-level preferences and your administrator account."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Settings" },
        ]}
      />

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : hospital.isLoading ? (
        <ListSkeleton rows={2} />
      ) : hospital.error ? (
        <ErrorState message={hospital.error} onRetry={hospital.refetch} />
      ) : !hospital.data ? (
        <ErrorState
          title="Hospital unavailable"
          message="We could not load the hospital linked to your account."
          onRetry={hospital.refetch}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General settings</CardTitle>
              <CardDescription>
                Hospital identity, services, capacity and operating hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{hospital.data.name}</p>
                <StatusBadge kind="hospital" value={hospital.data.approvalStatus} />
              </div>
              <p className="text-muted-foreground">
                {hospital.data.city} · {hospital.data.phone}
              </p>
              <div>
                <p className="text-muted-foreground text-xs">Services published</p>
                <p className="font-medium">
                  {(hospital.data.services ?? []).length === 0
                    ? "None configured"
                    : (hospital.data.services ?? [])
                        .map((service) => HOSPITAL_SERVICE_LABELS[service])
                        .join(", ")}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/hospital-admin/profile">Edit hospital information</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4" aria-hidden="true" />
                Appointment settings
              </CardTitle>
              <CardDescription>
                Opening hours used for hospital-wide coordination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hospital.data.operatingHours ? (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">Opening hours</p>
                    <p className="font-medium tabular-nums">
                      {hospital.data.operatingHours.opensAt} –{" "}
                      {hospital.data.operatingHours.closesAt}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Working days</p>
                    <p className="font-medium">
                      {hospital.data.operatingHours.workingDays
                        .map((day) => WEEKDAY_LABELS[day].slice(0, 3))
                        .join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Emergency availability</p>
                    <p className="font-medium">
                      {hospital.data.operatingHours.emergencyAvailable
                        ? "Available 24/7"
                        : "Not offered"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Operating hours are not configured yet.
                </p>
              )}
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Consultation slot length is published per doctor through their availability
                schedule, not at hospital level. Hospital-wide booking rules require backend
                support and are not editable here yet.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/hospital-admin/profile">Update operating hours</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4" aria-hidden="true" />
                Notification settings
              </CardTitle>
              <CardDescription>Hospital-related alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Appointment, doctor, department and payment notifications are delivered to
                the hospital notification centre as they happen.
              </p>
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Per-channel delivery preferences (email or SMS) are not part of the shared
                contract yet, so no switches are shown here.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/hospital-admin/notifications">Open notifications</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4" aria-hidden="true" />
                Account and access
              </CardTitle>
              <CardDescription>Your hospital administrator session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{user?.fullName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="font-medium">{user ? ROLE_LABELS[user.role] : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Assigned hospital</p>
                <p className="font-medium">{hospital.data.name}</p>
              </div>
              <div className="border-border/70 bg-muted/40 flex items-start gap-2 rounded-lg border px-3 py-2.5">
                <Lock className="text-muted-foreground mt-0.5 size-4" aria-hidden="true" />
                <p className="text-muted-foreground text-xs">
                  Account security, additional administrators and platform-wide permissions
                  are managed by the Super Admin, not from the hospital portal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
