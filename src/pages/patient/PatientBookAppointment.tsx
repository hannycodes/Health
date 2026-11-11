import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CalendarCheck, Check, Clock } from "lucide-react";
import { toast } from "sonner";

import { listAvailableDates, listSlots, type Slot } from "@/components/appointments/scheduling";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { Appointment, Payment, PaymentMethod } from "@/types";
import { formatCurrency, formatDate, formatTimeRange } from "@/utils/format";

const STEPS = ["Doctor", "Date", "Time", "Reason", "Review", "Payment", "Confirmation"];
const REASON_MIN_LENGTH = 10;

interface Confirmation {
  appointment: Appointment;
  payment: Payment | null;
}

export function PatientBookAppointment() {
  const { doctorId = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const handoffSummary = (location.state as { handoff?: string } | null)?.handoff ?? null;

  const doctorQuery = useServiceQuery(() => services.doctors.getById(doctorId), doctorId);
  const hospitalQuery = useServiceQuery(
    () =>
      doctorQuery.data
        ? services.hospitals.getById(doctorQuery.data.hospitalId)
        : Promise.resolve(null),
    doctorQuery.data?.hospitalId ?? "",
  );
  const availabilityQuery = useServiceQuery(
    () => services.doctors.listAvailability(doctorId),
    doctorId,
  );
  const bookedQuery = useServiceQuery(
    () => services.appointments.list({ doctorId }),
    doctorId,
  );

  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [useHandoff, setUseHandoff] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PAY_AT_HOSPITAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const doctor = doctorQuery.data;
  const hospital = hospitalQuery.data;
  const availability = availabilityQuery.data ?? [];
  const dates = listAvailableDates(availability);
  const bookedStartTimes = (bookedQuery.data ?? [])
    .filter((item) => item.date === date && item.status !== "CANCELLED")
    .map((item) => item.startTime);
  const slots = date ? listSlots(availability, bookedStartTimes, date) : [];

  if (doctorQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Book an appointment"
          breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]}
        />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (doctorQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Book an appointment"
          breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]}
        />
        <ErrorState message={doctorQuery.error} onRetry={doctorQuery.refetch} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Book an appointment"
          breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]}
        />
        <EmptyState
          title="Doctor not found"
          description="Choose another doctor to book with."
          action={
            <Button asChild size="sm">
              <Link to="/patient/doctors">Find a doctor</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!doctor.isAcceptingPatients && !confirmation) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Book an appointment"
          breadcrumbs={[
            { label: "Doctors", to: "/patient/doctors" },
            { label: doctor.fullName },
          ]}
        />
        <EmptyState
          title="Not accepting new patients"
          description={`${doctor.fullName} is not accepting new bookings right now. Browse other specialists in ${doctor.specialty}.`}
          action={
            <Button asChild size="sm">
              <Link to="/patient/doctors">Browse doctors</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const canContinue =
    step === 1 ||
    (step === 2 && Boolean(date)) ||
    (step === 3 && slot !== null) ||
    (step === 4 && reason.trim().length >= REASON_MIN_LENGTH) ||
    step === 5;

  function nextStep() {
    if (step === 4 && reason.trim().length < REASON_MIN_LENGTH) {
      setReasonError(`Describe the reason in at least ${REASON_MIN_LENGTH} characters.`);
      return;
    }
    setReasonError(null);
    setStep((current) => Math.min(current + 1, 6));
  }

  async function confirmBooking() {
    if (!doctor || !date || !slot) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const appointment = await services.appointments.create({
        patientId: user?.id ?? "",
        doctorId: doctor.id,
        hospitalId: doctor.hospitalId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: reason.trim(),
        paymentMethod,
      });
      const payment = await services.payments.getByAppointment(appointment.id);
      setConfirmation({ appointment, payment });
      setStep(7);
      toast.success("Appointment booked.");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 7 && confirmation) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Appointment confirmed"
          description="Your booking is visible to the doctor and the hospital immediately."
          breadcrumbs={[
            { label: "Appointments", to: "/patient/appointments" },
            { label: "Confirmation" },
          ]}
        />
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{doctor.fullName}</p>
                <p className="text-muted-foreground text-xs">
                  {hospital?.name} · {doctor.specialty}
                </p>
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Date</dt>
                <dd>{formatDate(confirmation.appointment.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Time</dt>
                <dd>
                  {formatTimeRange(
                    confirmation.appointment.startTime,
                    confirmation.appointment.endTime,
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-[11px] uppercase">Reason</dt>
                <dd>{confirmation.appointment.reason}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">
                  Appointment status
                </dt>
                <dd>
                  <StatusBadge kind="appointment" value={confirmation.appointment.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Payment</dt>
                <dd className="flex items-center gap-2">
                  {confirmation.payment ? (
                    <>
                      <StatusBadge kind="payment" value={confirmation.payment.status} />
                      <span className="text-muted-foreground text-xs">
                        {formatCurrency(confirmation.payment.amount)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">No payment record</span>
                  )}
                </dd>
              </div>
            </dl>
            {confirmation.payment?.status === "UNPAID_AT_HOSPITAL" && (
              <p className="text-muted-foreground text-xs">
                Pay at the hospital reception on the day of your visit. Payment status is
                tracked separately from the appointment status.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/patient/appointments/${confirmation.appointment.id}`}>
                  View appointment
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/patient/appointments">All appointments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book an appointment"
        description={`${doctor.fullName} · ${doctor.specialty} · ${hospital?.name ?? "Hospital"}`}
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Doctors", to: "/patient/doctors" },
          { label: doctor.fullName, to: `/patient/doctors/${doctor.id}` },
          { label: "Book" },
        ]}
      />

      <ol className="flex flex-wrap gap-1.5" aria-label="Booking steps">
        {STEPS.slice(0, 6).map((label, index) => {
          const value = index + 1;
          return (
            <li
              key={label}
              aria-current={step === value ? "step" : undefined}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px]",
                step === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground",
              )}
            >
              {value}. {label}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 && "Confirm your doctor"}
            {step === 2 && "Choose a date"}
            {step === 3 && "Choose a time"}
            {step === 4 && "Reason for the visit"}
            {step === 5 && "Review your booking"}
            {step === 6 && "Payment"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Doctor</dt>
                <dd className="font-medium">{doctor.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Specialty</dt>
                <dd>{doctor.specialty}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Hospital</dt>
                <dd>{hospital?.name ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">
                  Consultation fee
                </dt>
                <dd>{formatCurrency(doctor.consultationFee)}</dd>
              </div>
            </dl>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {availabilityQuery.isLoading ? (
                <ListSkeleton rows={1} />
              ) : dates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No published availability in the next 30 days. Choose another doctor or
                  contact the hospital.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs">
                    Only days the doctor has published are shown.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {dates.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setDate(item);
                          setSlot(null);
                        }}
                        aria-pressed={date === item}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-xs transition-colors",
                          date === item
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent",
                        )}
                      >
                        {formatDate(item)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {!date ? (
                <p className="text-muted-foreground text-sm">Choose a date first.</p>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No free slots on {formatDate(date)}. Go back and choose another day.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Times below are free on {formatDate(date)}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((item) => (
                      <button
                        key={item.startTime}
                        type="button"
                        onClick={() => setSlot(item)}
                        aria-pressed={slot?.startTime === item.startTime}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          slot?.startTime === item.startTime
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent",
                        )}
                      >
                        {item.startTime}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for the visit</Label>
                <Textarea
                  id="reason"
                  rows={4}
                  placeholder="Briefly describe your symptoms or the reason for the visit"
                  value={reason}
                  aria-invalid={Boolean(reasonError)}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setReasonError(null);
                  }}
                />
                {reasonError && <p className="text-destructive text-xs">{reasonError}</p>}
                <p className="text-muted-foreground text-xs">
                  The doctor sees only what you write here — not your AI conversation.
                </p>
              </div>

              {handoffSummary && (
                <div className="border-border/70 bg-muted/40 space-y-2 rounded-lg border border-dashed p-3 text-xs">
                  <p className="font-medium">Use a summary from your AI Assistant?</p>
                  <p className="text-muted-foreground">{handoffSummary}</p>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={useHandoff}
                      onChange={(event) => {
                        setUseHandoff(event.target.checked);
                        if (event.target.checked) setReason(handoffSummary);
                      }}
                      className="accent-primary mt-0.5 size-3.5"
                    />
                    <span>Share this summary with the doctor as my appointment reason.</span>
                  </label>
                  <p className="text-muted-foreground">
                    Nothing from the conversation is shared unless you tick this box.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Doctor</dt>
                <dd>{doctor.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Hospital</dt>
                <dd>{hospital?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Date</dt>
                <dd>{date ? formatDate(date) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Time</dt>
                <dd>{slot ? formatTimeRange(slot.startTime, slot.endTime) : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-[11px] uppercase">Reason</dt>
                <dd>{reason}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">
                  Consultation fee
                </dt>
                <dd>{formatCurrency(doctor.consultationFee)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] uppercase">Payment choice</dt>
                <dd>{paymentMethod === "ONLINE" ? "Pay online" : "Pay at hospital"}</dd>
              </div>
            </dl>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Choose how you want to pay {formatCurrency(doctor.consultationFee)}. Payment
                status is tracked separately from the appointment status.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("ONLINE")}
                  aria-pressed={paymentMethod === "ONLINE"}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    paymentMethod === "ONLINE"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent",
                  )}
                >
                  <span className="block font-medium">Pay online</span>
                  <span className="text-muted-foreground text-xs">
                    Payment is handled securely; its status is tracked separately from the
                    appointment.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("PAY_AT_HOSPITAL")}
                  aria-pressed={paymentMethod === "PAY_AT_HOSPITAL"}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    paymentMethod === "PAY_AT_HOSPITAL"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent",
                  )}
                >
                  <span className="block font-medium">Pay at hospital</span>
                  <span className="text-muted-foreground text-xs">
                    Pay at reception on the day of the visit.
                  </span>
                </button>
              </div>
              {submitError && (
                <p role="alert" className="text-destructive text-xs">
                  {submitError}
                </p>
              )}
              {bookedQuery.data?.some(
                (item) =>
                  item.date === date &&
                  item.startTime === slot?.startTime &&
                  item.status !== "CANCELLED",
              ) && (
                <p className="text-destructive text-xs">
                  That slot was just taken. Go back and choose another time.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              disabled={step === 1 || isSubmitting}
            >
              Back
            </Button>
            {step < 6 ? (
              <Button onClick={nextStep} disabled={!canContinue}>
                Continue
              </Button>
            ) : (
              <Button onClick={() => void confirmBooking()} disabled={isSubmitting}>
                <CalendarCheck className="size-4" aria-hidden="true" />
                {isSubmitting ? "Booking…" : "Confirm booking"}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {bookedQuery.data?.length ?? 0} existing bookings with this doctor
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
