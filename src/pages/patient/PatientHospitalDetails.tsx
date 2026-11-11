import { Link, useParams } from "react-router-dom";
import { BedDouble, Mail, MapPin, Phone, Star } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function PatientHospitalDetails() {
  const { id = "" } = useParams();
  const hospitalQuery = useServiceQuery(
    () => services.hospitals.getById(id),
    id,
  );
  const doctorsQuery = useServiceQuery(
    () => services.doctors.list({ hospitalId: id }),
    id,
  );

  const hospital = hospitalQuery.data;

  if (hospitalQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital" breadcrumbs={[{ label: "Hospitals", to: "/patient/hospitals" }]} />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (hospitalQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital" breadcrumbs={[{ label: "Hospitals", to: "/patient/hospitals" }]} />
        <ErrorState message={hospitalQuery.error} onRetry={hospitalQuery.refetch} />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital not found" breadcrumbs={[{ label: "Hospitals", to: "/patient/hospitals" }]} />
        <EmptyState
          title="This hospital is not available"
          description="It may have been removed or is not yet approved to accept appointments."
          action={
            <Button asChild size="sm">
              <Link to="/patient/hospitals">Back to hospitals</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const doctors = doctorsQuery.data ?? [];
  const occupancy = Math.round(
    (hospital.capacity.occupiedBeds / Math.max(hospital.capacity.totalBeds, 1)) * 100,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={hospital.name}
        description={`${hospital.city} · ${hospital.isVerified ? "Verified partner hospital" : "Awaiting verification"}`}
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Hospitals", to: "/patient/hospitals" },
          { label: hospital.name },
        ]}
        actions={
          <Button asChild>
            <Link to="/patient/doctors">Find a doctor</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About this hospital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">{hospital.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {hospital.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="font-normal">
                    {specialty}
                  </Badge>
                ))}
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <MapPin className="text-primary mt-0.5 size-4" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground text-[11px] uppercase">Address</dt>
                    <dd>{hospital.address}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="text-primary mt-0.5 size-4" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground text-[11px] uppercase">Phone</dt>
                    <dd>
                      <a href={`tel:${hospital.phone}`} className="hover:underline">
                        {hospital.phone}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="text-primary mt-0.5 size-4" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground text-[11px] uppercase">Email</dt>
                    <dd>
                      <a href={`mailto:${hospital.email}`} className="hover:underline">
                        {hospital.email}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Star className="mt-0.5 size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground text-[11px] uppercase">Rating</dt>
                    <dd>{hospital.rating > 0 ? hospital.rating.toFixed(1) : "Not rated yet"}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Doctors at this hospital</h2>
            {doctorsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : doctors.length === 0 ? (
              <EmptyState
                title="No doctors listed yet"
                description="This hospital has not published its doctors on MyHealth."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {doctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    hospitalName={hospital.name}
                    action={
                      <Button size="sm" variant="outline" className="w-full" asChild>
                        <Link to={`/patient/doctors/${doctor.id}`}>View profile</Link>
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <Card className="h-fit gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Hospital capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <BedDouble className="text-primary size-4" aria-hidden="true" />
              {hospital.capacity.occupiedBeds}/{hospital.capacity.totalBeds} beds occupied
            </p>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="img"
              aria-label={`${occupancy}% bed occupancy`}
            >
              <div className="bg-primary h-full" style={{ width: `${occupancy}%` }} />
            </div>
            <p className="text-muted-foreground text-xs">
              Intensive care: {hospital.capacity.occupiedIcuBeds}/{hospital.capacity.icuBeds} beds occupied.
            </p>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link to="/patient/doctors">Find a doctor to book</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
