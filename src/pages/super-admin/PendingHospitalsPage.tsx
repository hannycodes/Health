import { Link } from "react-router-dom";
import { CheckCircle2, FileText, MapPin, Phone } from "lucide-react";

import { HospitalApprovalDialog } from "@/components/admin/HospitalApprovalDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

export function PendingHospitalsPage() {
  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.hospitals.listPendingApprovals(),
    "pending-hospitals",
  );

  const applications = (data ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending hospital applications"
        description="Review submitted details and documents, then approve or reject. Every decision is recorded in the audit log."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Hospitals", to: "/admin/hospitals" },
          { label: "Pending" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/hospitals">All hospitals</Link>
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No applications waiting"
          description="Every hospital application has been reviewed. New submissions appear here."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {applications.map((hospital) => (
            <Card key={hospital.id}>
              <CardHeader>
                <CardTitle className="text-base">{hospital.name}</CardTitle>
                <CardDescription>
                  Submitted{" "}
                  {formatDate(
                    (hospital.submittedAt ?? hospital.createdAt).slice(0, 10),
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase">
                      Representative
                    </dt>
                    <dd>{hospital.representativeName ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase">Type</dt>
                    <dd>{hospital.hospitalType ?? "Not declared"}</dd>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="text-muted-foreground mt-0.5 size-3.5" />
                    <dd>
                      {hospital.city}
                      {hospital.region ? `, ${hospital.region}` : ""}
                    </dd>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Phone className="text-muted-foreground mt-0.5 size-3.5" />
                    <dd>{hospital.phone}</dd>
                  </div>
                  <div className="flex items-start gap-1.5 sm:col-span-2">
                    <FileText className="text-muted-foreground mt-0.5 size-3.5" />
                    <dd>
                      {hospital.documents?.length ?? 0} verification document
                      {(hospital.documents?.length ?? 0) === 1 ? "" : "s"} on file
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/hospitals/${hospital.id}`}>Review details</Link>
                  </Button>
                  <HospitalApprovalDialog
                    hospital={hospital}
                    mode="approve"
                    trigger={<Button size="sm">Approve</Button>}
                  />
                  <HospitalApprovalDialog
                    hospital={hospital}
                    mode="reject"
                    trigger={
                      <Button size="sm" variant="destructive">
                        Reject
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
