import { Link, useParams } from "react-router-dom";
import { CalendarPlus, Star, Stethoscope } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import type { Weekday } from "@/types";
import { formatCurrency, formatDate, getInitials } from "@/utils/format";

const WEEK_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function PatientDoctorDetails() {
  const { id = "" } = useParams();
  const doctorQuery = useServiceQuery(() => services.doctors.getById(id), id);
  const availabilityQuery = useServiceQuery(
    () => services.doctors.listAvailability(id),
    id,
  );

  const doctor = doctorQuery.data;
  const hospitalQuery = useServiceQuery(
    () => (doctor ? services.hospitals.getById(doctor.hospitalId) : Promise.resolve(null)),
    doctor?.hospitalId ?? "",
  );

  if (doctorQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor" breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]} />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (doctorQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor" breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]} />
        <ErrorState message={doctorQuery.error} onRetry={doctorQuery.refetch} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor not found" breadcrumbs={[{ label: "Doctors", to: "/patient/doctors" }]} />
        <EmptyState
          title="This doctor is not available"
          description="The profile may have been removed. Browse other specialists instead."
          action={
            <Button asChild size="sm">
              <Link to="/patient/doctors">Back to doctors</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const availability = (availabilityQuery.data ?? []).filter((slot) => slot.isActive);
  const nextAvailable = availability
    .slice()
    .sort(
      (a, b) =>
        WEEK_ORDER.indexOf(a.dayOfWeek) - WEEK_ORDER.indexOf(b.dayOfWeek) ||
        a.startTime.localeCompare(b.startTime),
    )[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={doctor.fullName}
        description={`${doctor.specialty} · ${hospitalQuery.data?.name ?? "Hospital unavailable"}`}
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Doctors", to: "/patient/doctors" },
          { label: doctor.fullName },
        ]}
        actions={
          <Button asChild disabled={!doctor.isAcceptingPatients}>
            <Link
              to={`/patient/appointments/book/${doctor.id}`}
              aria-disabled={!doctor.isAcceptingPatients}
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Book appointment
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-sm font-semibold">
                  {getInitials(doctor.fullName)}
                </span>
                <div>
                  <p className="font-semibold">{doctor.fullName}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Stethoscope className="size-3" aria-hidden="true" />
                    {doctor.specialty}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{doctor.bio}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Experience</dt>
                  <dd>{doctor.yearsExperience} years</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Consultation fee</dt>
                  <dd>{formatCurrency(doctor.consultationFee)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase">Rating</dt>
                  <dd className="flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {doctor.rating.toFixed(1)}
                  </dd>
                </div>
              </dl>
              <Badge variant={doctor.isAcceptingPatients ? "secondary" : "outline"}>
                {doctor.isAcceptingPatients ? "Accepting new patients" : "Not accepting new patients"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly availability</CardTitle>
            </CardHeader>
            <CardContent>
              {availabilityQuery.isLoading ? (
                <LoadingSpinner label="Loading availability" />
              ) : availability.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This doctor has not published availability yet. Contact the hospital to
                  arrange a visit.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {WEEK_ORDER.filter((day) =>
                    availability.some((slot) => slot.dayOfWeek === day),
                  ).map((day) => {
                    const slots = availability.filter((slot) => slot.dayOfWeek === day);
                    return (
                      <li
                        key={day}
                        className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="font-medium">{DAY_LABELS[day]}</span>
                        <span className="text-muted-foreground text-xs">
                          {slots
                            .map((slot) => `${slot.startTime}–${slot.endTime}`)
                            .join(", ")}{" "}
                          · {slots[0]?.slotDurationMinutes} min slots
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-muted-foreground mt-3 text-xs">
                Only times published by the doctor are offered during booking.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Book a consultation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {nextAvailable
                ? `Next published availability: ${DAY_LABELS[nextAvailable.dayOfWeek]} ${nextAvailable.startTime}–${nextAvailable.endTime}.`
                : "No availability published yet."}
            </p>
            <p className="text-muted-foreground text-xs">
              {hospitalQuery.data
                ? `${hospitalQuery.data.name} · ${hospitalQuery.data.city}`
                : "Hospital details unavailable"}
            </p>
            <p className="text-muted-foreground text-xs">
              {hospitalQuery.data?.phone
                ? `Hospital phone: ${hospitalQuery.data.phone}`
                : ""}
            </p>
            <Button className="w-full" asChild disabled={!doctor.isAcceptingPatients}>
              <Link to={`/patient/appointments/book/${doctor.id}`}>
                {doctor.isAcceptingPatients ? "Choose a date and time" : "Not accepting patients"}
              </Link>
            </Button>
            <p className="text-muted-foreground text-[11px]">
              Availability shown for the next 30 days.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Profile reviewed on {formatDate(new Date().toISOString().slice(0, 10))}. Credentials
        are verified by the hospital, not by MyHealth.
      </p>
    </div>
  );
}
