import { Link } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HospitalProfileForm } from "@/components/hospital/HospitalProfileForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HOSPITAL_SERVICE_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

export function HospitalProfilePage() {
  const { hospitalId = "" } = useAuth();

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.hospitals.getById(hospitalId),
    `hospital:${hospitalId}`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital profile"
        description="Contact details, services and operating information for your hospital."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Hospital profile" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/hospital-admin/settings">Hospital settings</Link>
          </Button>
        }
      />

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : isLoading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data ? (
        <ErrorState
          title="Hospital unavailable"
          message="We could not find the hospital linked to your account."
          onRetry={refetch}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Building2 className="size-4" aria-hidden="true" />
                  {data.name}
                  <StatusBadge kind="hospital" value={data.approvalStatus} />
                </CardTitle>
                <CardDescription>
                  Registered on {formatDate(data.createdAt.slice(0, 10))} · {data.city}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {data.isVerified ? "Verified" : "Not verified yet"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Beds</p>
                  <p className="font-medium tabular-nums">
                    {data.capacity.occupiedBeds} / {data.capacity.totalBeds} occupied
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ICU</p>
                  <p className="font-medium tabular-nums">
                    {data.capacity.occupiedIcuBeds} / {data.capacity.icuBeds} occupied
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Opening hours</p>
                  <p className="font-medium">
                    {data.operatingHours
                      ? `${data.operatingHours.opensAt} – ${data.operatingHours.closesAt}`
                      : "Not configured"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Emergency</p>
                  <p className="font-medium">
                    {data.operatingHours?.emergencyAvailable ? "Available 24/7" : "Not offered"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Services offered
                </p>
                {(data.services ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No services configured yet. Add the services your hospital actually
                    provides below.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(data.services ?? []).map((service) => (
                      <Badge key={service} variant="secondary">
                        {HOSPITAL_SERVICE_LABELS[service]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-border/70 bg-muted/40 flex items-start gap-2 rounded-lg border px-3 py-2.5">
                <ShieldCheck className="text-muted-foreground mt-0.5 size-4" aria-hidden="true" />
                <p className="text-muted-foreground text-xs">
                  Registration approval and suspension are decided by the Super Admin.
                  You can review your status here, but you cannot change it.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit hospital information</CardTitle>
              <CardDescription>
                Changes apply immediately to the hospital record shown to patients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HospitalProfileForm hospital={data} onSaved={refetch} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
