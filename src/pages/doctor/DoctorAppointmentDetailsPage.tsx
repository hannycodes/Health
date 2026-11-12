import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, CalendarDays, ClipboardPlus, FileHeart, Sparkles, Wallet } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_METHOD_LABELS } from "@/constants";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { ageLabel, canCompleteAppointment } from "@/features/doctor/utils";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatDate, formatDateTime, formatTimeRange } from "@/utils/format";

export function DoctorAppointmentDetailsPage() {
  const { id = "" } = useParams();
  const { appointments, isLoading, error, refetch } = useDoctorWorkspace();
  const [isCompleting, setIsCompleting] = useState(false);

  const appointment = appointments.find((row) => row.id === id);
  const patientId = appointment?.patientId ?? "";

  const patient = useServiceQuery(
    () => (patientId ? services.patients.getById(patientId) : Promise.resolve(null)),
    patientId,
  );
  const recommendations = useServiceQuery(
    () => (patientId ? services.aiNavigator.listByPatient(patientId) : Promise.resolve([])),
    patientId,
  );
  const records = useServiceQuery(
    () => (patientId ? services.medicalRecords.listByPatient(patientId) : Promise.resolve([])),
    patientId,
  );

  const sharedSummary = recommendations.data?.[0];

  async function complete() {
    if (!appointment) return;
    setIsCompleting(true);
    try {
      await services.appointments.complete(appointment.id);
      toast.success("Consultation marked as completed. Payment status unchanged.");
      refetch();
    } catch (completeError) {
      toast.error(getApiErrorMessage(completeError));
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment" description="Loading appointment details…" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment" />
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment not found"
          breadcrumbs={[
            { label: "Doctor", to: "/doctor" },
            { label: "Appointments", to: "/doctor/appointments" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={CalendarDays}
          title="This appointment is not available to you"
          description="It may belong to another clinician or no longer exist."
          action={
            <Button asChild>
              <Link to="/doctor/appointments">Back to appointments</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Appointment · ${appointment.patientName}`}
        description={`${formatDate(appointment.date)} · ${formatTimeRange(
          appointment.startTime,
          appointment.endTime,
        )} · ${appointment.hospitalName}`}
        breadcrumbs={[
          { label: "Doctor", to: "/doctor" },
          { label: "Appointments", to: "/doctor/appointments" },
          { label: appointment.id },
        ]}
        actions={
          <>
            {canCompleteAppointment(appointment) && (
              <ConfirmDialog
                trigger={
                  <Button variant="success" disabled={isCompleting}>
                    Complete consultation
                  </Button>
                }
                title="Mark this consultation as completed?"
                description="The appointment status becomes COMPLETED. Payment status is tracked separately and is not changed."
                confirmLabel="Mark completed"
                onConfirm={complete}
              />
            )}
            <Button variant="outline" asChild>
              <Link
                to={`/doctor/patients/${appointment.patientId}/records/new?appointmentId=${appointment.id}`}
              >
                <ClipboardPlus className="size-4" />
                Start consultation
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Appointment ID
                </p>
                <p className="text-sm">{appointment.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Status</p>
                <StatusBadge kind="appointment" value={appointment.status} />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Date</p>
                <p className="text-sm">{formatDate(appointment.date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Time</p>
                <p className="text-sm">
                  {formatTimeRange(appointment.startTime, appointment.endTime)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Hospital</p>
                <p className="text-sm">{appointment.hospitalName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Booked on
                </p>
                <p className="text-sm">{formatDateTime(appointment.createdAt)}</p>
              </div>
              <Separator className="sm:col-span-2" />
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Payment status
                </p>
                {appointment.paymentStatus ? (
                  <StatusBadge kind="payment" value={appointment.paymentStatus} />
                ) : (
                  <p className="text-sm">No payment record</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Payment method
                </p>
                <p className="text-sm">
                  {appointment.paymentMethod
                    ? PAYMENT_METHOD_LABELS[appointment.paymentMethod]
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment reason</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{appointment.reason}</p>
              {sharedSummary ? (
                <div className="bg-secondary/50 rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium uppercase">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Symptom summary shared by the patient
                  </p>
                  <p className="mt-1 text-sm">{sharedSummary.symptomsSummary}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Voluntarily shared from the Patient AI Navigator on{" "}
                    {formatDateTime(sharedSummary.createdAt)}. The patient&apos;s private
                    conversation is not exposed.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  The patient did not share an AI symptom summary with this booking.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Name</p>
                <p>{appointment.patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">Age</p>
                <p>{ageLabel(patient.data?.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Blood type
                </p>
                <p>{patient.data?.bloodType ?? "Not recorded"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase">
                  Clinical records
                </p>
                <p>{records.data?.length ?? 0} record(s)</p>
              </div>
              <div className="bg-muted/50 rounded-lg border p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  Allergies and existing conditions
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Not recorded — no structured field in the shared data model.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/doctor/patients/${appointment.patientId}`}>View patient</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/doctor/patients/${appointment.patientId}/history`}>
                    <FileHeart className="size-4" />
                    View medical history
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/doctor/assistant?patientId=${appointment.patientId}`}>
                    <Sparkles className="size-4" />
                    Open AI assistant
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4" aria-hidden="true" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Badge variant="outline">Read-only in the Doctor Portal</Badge>
              <p className="text-muted-foreground">
                Payment status is managed by the patient or hospital administration.
                Completing the appointment never changes it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
