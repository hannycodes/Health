import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserCog,
} from "lucide-react";

import { HospitalApprovalDialog } from "@/components/admin/HospitalApprovalDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HOSPITAL_TYPE_LABELS } from "@/constants";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate, formatDateTime } from "@/utils/format";

export function HospitalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const key = id ?? "";

  const hospitalQuery = useServiceQuery(
    () => (id ? services.hospitals.getById(id) : Promise.resolve(null)),
    key,
  );
  const doctorsQuery = useServiceQuery(
    () => (id ? services.doctors.list({ hospitalId: id }) : Promise.resolve([])),
    key,
  );
  const adminsQuery = useServiceQuery(
    () =>
      id ? services.administrators.list({ hospitalId: id }) : Promise.resolve([]),
    key,
  );

  const hospital = hospitalQuery.data;

  if (hospitalQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital details" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (hospitalQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital details" />
        <ErrorState message={hospitalQuery.error} onRetry={hospitalQuery.refetch} />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital not found" />
        <EmptyState
          icon={Building2}
          title="This hospital does not exist"
          description="It may have been removed or the link is incorrect."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/hospitals">Back to hospitals</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={hospital.name}
        description={`${hospital.city}${hospital.region ? `, ${hospital.region}` : ""} · ${hospital.id}`}
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Hospitals", to: "/admin/hospitals" },
          { label: hospital.name },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/hospitals">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            {hospital.approvalStatus === "PENDING" && (
              <>
                <HospitalApprovalDialog
                  hospital={hospital}
                  mode="approve"
                  trigger={<Button>Approve</Button>}
                />
                <HospitalApprovalDialog
                  hospital={hospital}
                  mode="reject"
                  trigger={<Button variant="destructive">Reject</Button>}
                />
              </>
            )}
            {hospital.approvalStatus === "APPROVED" && (
              <HospitalApprovalDialog
                hospital={hospital}
                mode="suspend"
                trigger={<Button variant="destructive">Suspend</Button>}
              />
            )}
            {hospital.approvalStatus === "SUSPENDED" && (
              <HospitalApprovalDialog
                hospital={hospital}
                mode="reactivate"
                trigger={<Button>Reactivate</Button>}
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="hospital" value={hospital.approvalStatus} />
        {hospital.hospitalType && (
          <Badge variant="outline">{HOSPITAL_TYPE_LABELS[hospital.hospitalType]}</Badge>
        )}
        <Badge variant="outline">{hospital.capacity.totalBeds} beds</Badge>
        <Badge variant="outline">{hospital.specialties.length} specialties</Badge>
      </div>

      {hospital.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Rejection reason</p>
          <p className="text-sm text-red-800">{hospital.rejectionReason}</p>
        </div>
      )}
      {hospital.suspensionReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Suspension reason</p>
          <p className="text-sm text-amber-800">{hospital.suspensionReason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{hospital.description}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 size-3.5" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Address</dt>
                  <dd>{hospital.address}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="text-muted-foreground mt-0.5 size-3.5" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">City</dt>
                  <dd>{hospital.city}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="text-muted-foreground mt-0.5 size-3.5" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Email</dt>
                  <dd className="break-all">{hospital.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="text-muted-foreground mt-0.5 size-3.5" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Phone</dt>
                  <dd>{hospital.phone}</dd>
                </div>
              </div>
              {hospital.website && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Globe className="text-muted-foreground mt-0.5 size-3.5" />
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase">
                      Website
                    </dt>
                    <dd className="break-all">{hospital.website}</dd>
                  </div>
                </div>
              )}
            </dl>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Specialties</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {hospital.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Representative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Name</dt>
                <dd>{hospital.representativeName ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Email</dt>
                <dd className="break-all">
                  {hospital.representativeEmail ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Phone</dt>
                <dd>{hospital.representativePhone ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">
                  Application submitted
                </dt>
                <dd>
                  {hospital.submittedAt
                    ? formatDateTime(hospital.submittedAt)
                    : formatDate(hospital.createdAt.slice(0, 10))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">
                  Last reviewed
                </dt>
                <dd>
                  {hospital.reviewedAt
                    ? formatDateTime(hospital.reviewedAt)
                    : "Not reviewed yet"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase">Reviewer</dt>
                <dd>{hospital.reviewedBy ?? "—"}</dd>
              </div>
            </dl>

            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="size-4" />
                Supporting documents
              </p>
              {hospital.documents && hospital.documents.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {hospital.documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-1 text-xs"
                    >
                      <span>{document.name}</span>
                      <span className="text-muted-foreground">
                        {document.type.replaceAll("_", " ").toLowerCase()} ·{" "}
                        {formatDate(document.uploadedAt.slice(0, 10))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs">
                  No documents were submitted.
                </p>
              )}
              <p className="text-muted-foreground mt-2 text-[11px]">
                Private documents are served through an authenticated backend
                endpoint. This screen deliberately creates no public file links.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="size-4" />
              Doctors ({doctorsQuery.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doctorsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : doctorsQuery.error ? (
              <ErrorState
                message={doctorsQuery.error}
                onRetry={doctorsQuery.refetch}
              />
            ) : (doctorsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No doctors are registered at this hospital yet.
              </p>
            ) : (
              <ul className="divide-y">
                {(doctorsQuery.data ?? []).map((doctor) => (
                  <li
                    key={doctor.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="truncate">{doctor.fullName}</span>
                    <span className="text-muted-foreground text-xs">
                      {doctor.specialty}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4" />
              Administrators ({adminsQuery.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : adminsQuery.error ? (
              <ErrorState message={adminsQuery.error} onRetry={adminsQuery.refetch} />
            ) : (adminsQuery.data ?? []).length === 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  No administrator is assigned to this hospital.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/administrators">Manage administrators</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {(adminsQuery.data ?? []).map((admin) => (
                  <li
                    key={admin.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="truncate">{admin.fullName}</span>
                    <StatusBadge kind="account" value={admin.status ?? "ACTIVE"} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {hospital.approvalStatus === "PENDING" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ShieldCheck className="size-3.5" />
          Approval is confirmed by the backend before the status above changes.
        </p>
      )}
    </div>
  );
}
