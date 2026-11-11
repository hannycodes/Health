import { Link, useParams } from "react-router-dom";
import { CalendarClock, MapPin, Stethoscope, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTimeRange,
} from "@/utils/format";

export function PatientAppointmentDetails() {
  const { id = "" } = useParams();

  const detailsQuery = useServiceQuery(async () => {
    const appointment = await services.appointments.getById(id);
    if (!appointment) return null;
    const [doctor, hospital, payment] = await Promise.all([
      services.doctors.getById(appointment.doctorId),
      services.hospitals.getById(appointment.hospitalId),
      services.payments.getByAppointment(appointment.id),
    ]);
    return { appointment, doctor, hospital, payment };
  }, id);

  const details = detailsQuery.data;

  async function cancelAppointment() {
    if (!details) return;
    try {
      await services.appointments.cancel(details.appointment.id);
      toast.success("Appointment cancelled. The doctor has been notified.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (detailsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment"
          breadcrumbs={[{ label: "Appointments", to: "/patient/appointments" }]}
        />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detailsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment"
          breadcrumbs={[{ label: "Appointments", to: "/patient/appointments" }]}
        />
        <ErrorState message={detailsQuery.error} onRetry={detailsQuery.refetch} />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment not found"
          breadcrumbs={[{ label: "Appointments", to: "/patient/appointments" }]}
        />
        <EmptyState
          title="This appointment does not exist"
          description="It may belong to another account or have been removed."
          action={
            <Button asChild size="sm">
              <Link to="/patient/appointments">Back to appointments</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { appointment, doctor, hospital, payment } = details;
  const canCancel = appointment.status === "BOOKED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Appointment with ${doctor?.fullName ?? "your doctor"}`}
        description={`${formatDate(appointment.date)} · ${formatTimeRange(appointment.startTime, appointment.endTime)}`}
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Appointments", to: "/patient/appointments" },
          { label: "Details" },
        ]}
        actions={
          canCancel ? (
            <ConfirmDialog
              trigger={<Button variant="destructive">Cancel appointment</Button>}
              title="Cancel this appointment?"
              description={`The appointment on ${formatDate(appointment.date)} at ${appointment.startTime} will be cancelled for you, the doctor and the hospital. Payment status is unchanged.`}
              confirmLabel="Cancel appointment"
              destructive
              onConfirm={cancelAppointment}
            />
          ) : (
            <Button variant="outline" asChild>
              <Link to="/patient/doctors">Book another appointment</Link>
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Appointment details</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="appointment" value={appointment.status} />
                {payment && <StatusBadge kind="payment" value={payment.status} />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Stethoscope className="text-primary mt-0.5 size-4" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Doctor</dt>
                  <dd>
                    {doctor ? (
                      <Link to={`/patient/doctors/${doctor.id}`} className="hover:underline">
                        {doctor.fullName}
                      </Link>
                    ) : (
                      "Unknown doctor"
                    )}
                    {doctor && (
                      <span className="text-muted-foreground block text-xs">
                        {doctor.specialty}
                      </span>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="text-primary mt-0.5 size-4" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Hospital</dt>
                  <dd>
                    {hospital ? (
                      <Link
                        to={`/patient/hospitals/${hospital.id}`}
                        className="hover:underline"
                      >
                        {hospital.name}
                      </Link>
                    ) : (
                      "Unknown hospital"
                    )}
                    {hospital && (
                      <span className="text-muted-foreground block text-xs">
                        {hospital.address}
                      </span>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarClock className="text-primary mt-0.5 size-4" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">
                    Date & time
                  </dt>
                  <dd>{formatDate(appointment.date)}</dd>
                  <dd className="text-muted-foreground text-xs">
                    {formatTimeRange(appointment.startTime, appointment.endTime)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="text-primary mt-0.5 size-4" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Payment</dt>
                  <dd>
                    {payment
                      ? `${formatCurrency(payment.amount)} · ${payment.method === "ONLINE" ? "Online" : "Pay at hospital"}`
                      : "No payment record"}
                  </dd>
                  {payment?.transactionRef && (
                    <dd className="text-muted-foreground text-xs">
                      Ref {payment.transactionRef}
                    </dd>
                  )}
                </div>
              </div>
            </dl>

            <div>
              <p className="text-muted-foreground text-[11px] uppercase">Reason for visit</p>
              <p>{appointment.reason}</p>
            </div>

            <p className="text-muted-foreground text-xs">
              Booked {formatDateTime(appointment.createdAt)} · Last updated{" "}
              {formatDateTime(appointment.updatedAt)}
            </p>

            {!canCancel && (
              <p className="text-muted-foreground text-xs">
                {appointment.status === "COMPLETED"
                  ? "Completed appointments cannot be cancelled. Contact the hospital for follow-up care."
                  : "This appointment is cancelled and cannot be changed. Book a new appointment if you still need care."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Need to change something?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground text-xs">
              Cancelling updates the doctor and hospital immediately. Payment status is
              never changed by a cancellation.
            </p>
            {payment?.status === "UNPAID_AT_HOSPITAL" && appointment.status === "BOOKED" && (
              <p className="text-muted-foreground text-xs">
                This visit is marked “pay at hospital”. Pay at reception on the day.
              </p>
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/patient/assistant">Ask the AI Assistant about your symptoms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
