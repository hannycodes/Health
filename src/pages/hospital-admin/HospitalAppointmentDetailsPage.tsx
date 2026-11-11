import { Link, useParams } from "react-router-dom";
import { Info } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatCurrency, formatDate, formatTimeRange } from "@/utils/format";

export function HospitalAppointmentDetailsPage() {
  const { id = "" } = useParams();
  const { hospitalId = "" } = useAuth();

  const detail = useServiceQuery(async () => {
    if (!id) return null;
    const [rows, payment] = await Promise.all([
      services.appointments.listDetailed({ hospitalId }),
      services.payments.getByAppointment(id),
    ]);
    return { appointment: rows.find((row) => row.id === id) ?? null, payment };
  }, `appointment:${id}:${hospitalId}`);

  const appointment = detail.data?.appointment;
  const payment = detail.data?.payment;

  async function cancelAppointment() {
    if (!appointment) return;
    try {
      await services.appointments.cancel(appointment.id);
      toast.success("Appointment cancelled. The patient and doctor were notified.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (!hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment" />
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment" description="Loading appointment details…" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment" />
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment not available"
          breadcrumbs={[
            { label: "Hospital admin", to: "/hospital-admin" },
            { label: "Appointments", to: "/hospital-admin/appointments" },
            { label: "Not available" },
          ]}
        />
        <ErrorState
          title="This appointment is not part of your hospital's records"
          message="Hospital administrators can only open appointments booked at their own hospital."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Appointment ${appointment.id}`}
        description={`${formatDate(appointment.date)} · ${formatTimeRange(
          appointment.startTime,
          appointment.endTime,
        )}`}
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Appointments", to: "/hospital-admin/appointments" },
          { label: appointment.id },
        ]}
        actions={
          appointment.status === "BOOKED" ? (
            <ConfirmDialog
              trigger={<Button variant="destructive">Cancel appointment</Button>}
              title="Cancel this appointment?"
              description={`The appointment with ${appointment.doctorName} on ${formatDate(
                appointment.date,
              )} at ${appointment.startTime} will be cancelled and both the patient and doctor notified. Payment status is unchanged.`}
              confirmLabel="Cancel appointment"
              destructive
              onConfirm={cancelAppointment}
            />
          ) : (
            <Badge variant="outline">No actions available</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment information</CardTitle>
            <CardDescription>Shared record across all MyHealth portals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="appointment" value={appointment.status} />
              {appointment.paymentStatus && (
                <StatusBadge kind="payment" value={appointment.paymentStatus} />
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Date</dt>
                <dd className="font-medium">{formatDate(appointment.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Time</dt>
                <dd className="font-medium tabular-nums">
                  {formatTimeRange(appointment.startTime, appointment.endTime)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Department</dt>
                <dd className="font-medium">{appointment.doctorSpecialty}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Booked</dt>
                <dd className="font-medium">
                  {formatDate(appointment.createdAt.slice(0, 10))}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-muted-foreground text-xs">Reason for appointment</p>
              <p className="mt-1 text-sm">{appointment.reason}</p>
            </div>

            <div className="border-border/70 bg-muted/40 flex items-start gap-2 rounded-lg border px-3 py-2.5">
              <Info className="text-muted-foreground mt-0.5 size-4" aria-hidden="true" />
              <p className="text-muted-foreground text-xs">
                Only the treating doctor can mark this visit as completed. Hospital admins
                cannot change clinical outcomes or payment status of online transactions.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{appointment.patientName}</p>
                <p className="text-muted-foreground text-xs">{appointment.patientId}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/hospital-admin/patients/${appointment.patientId}`}>
                  View patient record
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Doctor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{appointment.doctorName}</p>
                <p className="text-muted-foreground text-xs">
                  {appointment.doctorSpecialty}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/hospital-admin/doctors/${appointment.doctorId}`}>
                  View doctor profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
              <CardDescription>
                Payment status is independent from the appointment status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!payment ? (
                <p className="text-muted-foreground">No payment record for this visit.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge kind="payment" value={payment.status} />
                    <Badge variant="outline">{PAYMENT_METHOD_LABELS[payment.method]}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Reference</p>
                    <p className="font-medium">{payment.transactionRef ?? "—"}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/hospital-admin/payments">Open payment overview</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
