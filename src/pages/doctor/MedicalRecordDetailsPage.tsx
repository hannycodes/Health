import { Link, useParams } from "react-router-dom";
import { FileHeart, Lock, Pill } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorizedPatient } from "@/features/doctor/services/doctorAccess";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function MedicalRecordDetailsPage() {
  const { id = "", recordId = "" } = useParams();
  const { user } = useAuth();
  const doctorId = user?.id ?? "";

  const patient = useServiceQuery(
    () => getAuthorizedPatient(doctorId, id),
    `${doctorId}:${id}`,
  );
  const records = useServiceQuery(
    () => services.medicalRecords.listByPatient(id),
    `${doctorId}:${id}`,
  );
  const doctors = useServiceQuery(() => services.doctors.list(), "doctors");
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ doctorId, patientId: id }),
    `${doctorId}:${id}`,
  );

  const record = records.data?.find((item) => item.id === recordId);
  const author = doctors.data?.find((item) => item.id === record?.doctorId);
  const hospital = hospitals.data?.find((item) => item.id === record?.hospitalId);
  const linkedAppointment = appointments.data?.find(
    (item) => item.id === record?.appointmentId,
  );

  if (patient.isLoading || records.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clinical record" description="Loading record…" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (patient.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clinical record" />
        <ErrorState message={patient.error} onRetry={patient.refetch} />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Record not found"
          breadcrumbs={[
            { label: "Doctor", to: "/doctor" },
            { label: "Patients", to: "/doctor/patients" },
            { label: "Record" },
          ]}
        />
        <EmptyState
          icon={FileHeart}
          title="This record is not available"
          description="It may belong to another patient or no longer exist."
          action={
            <Button asChild>
              <Link to={`/doctor/patients/${id}/history`}>Back to history</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.diagnosis || "Consultation record"}
        description={`Record ${record.id} · recorded ${formatDateTime(record.recordedAt)}`}
        breadcrumbs={[
          { label: "Doctor", to: "/doctor" },
          { label: "Patients", to: "/doctor/patients" },
          { label: patient.data?.fullName ?? id, to: `/doctor/patients/${id}` },
          { label: "Record" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to={`/doctor/patients/${id}/history`}>Back to history</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Record date
                  </p>
                  <p className="text-sm">{formatDateTime(record.recordedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Authoring doctor
                  </p>
                  <p className="text-sm">{author?.fullName ?? "Unknown doctor"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Hospital
                  </p>
                  <p className="text-sm">{hospital?.name ?? "Unknown hospital"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Record type
                  </p>
                  <Badge variant="outline">Consultation record</Badge>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Assessment / diagnosis
                </p>
                <p className="text-sm">{record.diagnosis}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Treatment plan
                </p>
                <p className="text-sm">{record.treatment}</p>
              </div>

              {record.prescription.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Prescription
                  </p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {record.prescription.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Pill className="text-primary mt-0.5 size-3.5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {record.notes && (
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase">
                    Clinical notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked appointment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {linkedAppointment ? (
                <Link
                  to={`/doctor/appointments/${linkedAppointment.id}`}
                  className="hover:underline"
                >
                  {linkedAppointment.date} · {linkedAppointment.startTime} ·{" "}
                  {linkedAppointment.reason}
                </Link>
              ) : (
                <p className="text-muted-foreground">No appointment linked to this record.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4" aria-hidden="true" />
                Record lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Records are append-only: there is no edit or amendment endpoint, so this
                record cannot be modified here.
              </p>
              <p className="text-muted-foreground">
                Corrections require an amendment workflow in the backend contract.
                Author and timestamp are preserved as recorded.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/doctor/patients/${id}/records/new`}>Add a new record</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
