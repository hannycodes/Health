import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HOSPITAL_SERVICE_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/constants";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type {
  Hospital,
  HospitalServiceOffering,
  Weekday,
} from "@/types";
import { cn } from "@/lib/utils";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const profileSchema = z
  .object({
    name: z.string().min(2, "Enter the hospital name"),
    description: z.string().min(20, "Describe the hospital in at least 20 characters"),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid contact email"),
    phone: z.string().min(7, "Enter a contact phone number"),
    address: z.string().min(5, "Enter the physical address"),
    city: z.string().min(2, "Enter the city"),
    totalBeds: z.string().regex(/^\d+$/, "Enter a whole number"),
    occupiedBeds: z.string().regex(/^\d+$/, "Enter a whole number"),
    icuBeds: z.string().regex(/^\d+$/, "Enter a whole number"),
    occupiedIcuBeds: z.string().regex(/^\d+$/, "Enter a whole number"),
    opensAt: z.string().regex(timePattern, "Use a 24-hour time such as 08:00"),
    closesAt: z.string().regex(timePattern, "Use a 24-hour time such as 18:00"),
    emergencyAvailable: z.boolean(),
    workingDays: z.array(z.string()).min(1, "Choose at least one working day"),
    services: z.array(z.string()),
  })
  .refine((values) => Number(values.occupiedBeds) <= Number(values.totalBeds), {
    message: "Occupied beds cannot exceed total beds",
    path: ["occupiedBeds"],
  })
  .refine(
    (values) => Number(values.occupiedIcuBeds) <= Number(values.icuBeds),
    {
      message: "Occupied ICU beds cannot exceed ICU beds",
      path: ["occupiedIcuBeds"],
    },
  );

type ProfileValues = z.infer<typeof profileSchema>;

interface HospitalProfileFormProps {
  hospital: Hospital;
  onSaved?: (hospital: Hospital) => void;
}

function ToggleChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/30 bg-secondary text-secondary-foreground"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function HospitalProfileForm({ hospital, onSaved }: HospitalProfileFormProps) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: hospital.name,
      description: hospital.description,
      email: hospital.email,
      phone: hospital.phone,
      address: hospital.address,
      city: hospital.city,
      totalBeds: String(hospital.capacity.totalBeds),
      occupiedBeds: String(hospital.capacity.occupiedBeds),
      icuBeds: String(hospital.capacity.icuBeds),
      occupiedIcuBeds: String(hospital.capacity.occupiedIcuBeds),
      opensAt: hospital.operatingHours?.opensAt ?? "08:00",
      closesAt: hospital.operatingHours?.closesAt ?? "18:00",
      emergencyAvailable: hospital.operatingHours?.emergencyAvailable ?? false,
      workingDays: hospital.operatingHours?.workingDays ?? [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
      ],
      services: hospital.services ?? [],
    },
  });

  const errors = form.formState.errors;
  const workingDays = form.watch("workingDays");
  const selectedServices = form.watch("services");

  function toggleWorkingDay(day: Weekday) {
    const next = workingDays.includes(day)
      ? workingDays.filter((value) => value !== day)
      : [...workingDays, day];
    form.setValue("workingDays", next, { shouldValidate: true });
  }

  function toggleService(service: HospitalServiceOffering) {
    const next = selectedServices.includes(service)
      ? selectedServices.filter((value) => value !== service)
      : [...selectedServices, service];
    form.setValue("services", next);
  }

  async function onSubmit(values: ProfileValues) {
    try {
      const saved = await services.hospitals.update(hospital.id, {
        name: values.name.trim(),
        description: values.description.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        city: values.city.trim(),
        services: values.services as HospitalServiceOffering[],
        capacity: {
          ...hospital.capacity,
          totalBeds: Number(values.totalBeds),
          occupiedBeds: Number(values.occupiedBeds),
          icuBeds: Number(values.icuBeds),
          occupiedIcuBeds: Number(values.occupiedIcuBeds),
        },
        operatingHours: {
          opensAt: values.opensAt,
          closesAt: values.closesAt,
          workingDays: values.workingDays as Weekday[],
          emergencyAvailable: values.emergencyAvailable,
        },
      });
      toast.success("Hospital information updated.");
      onSaved?.(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Hospital information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hospital-name">Hospital name</Label>
            <Input id="hospital-name" aria-invalid={!!errors.name} {...form.register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hospital-city">City</Label>
            <Input id="hospital-city" aria-invalid={!!errors.city} {...form.register("city")} />
            {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hospital-email">Contact email</Label>
            <Input
              id="hospital-email"
              type="email"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hospital-phone">Contact phone</Label>
            <Input
              id="hospital-phone"
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hospital-address">Physical address</Label>
          <Input
            id="hospital-address"
            aria-invalid={!!errors.address}
            {...form.register("address")}
          />
          {errors.address && (
            <p className="text-destructive text-xs">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hospital-description">Description</Label>
          <Textarea
            id="hospital-description"
            rows={3}
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          {errors.description && (
            <p className="text-destructive text-xs">{errors.description.message}</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Services offered</h3>
          <p className="text-muted-foreground text-sm">
            Only select a service if your hospital actually provides it — patients rely on
            this list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HOSPITAL_SERVICE_LABELS) as HospitalServiceOffering[]).map(
            (service) => (
              <ToggleChip
                key={service}
                active={selectedServices.includes(service)}
                onClick={() => toggleService(service)}
              >
                {HOSPITAL_SERVICE_LABELS[service]}
              </ToggleChip>
            ),
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Capacity</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="hospital-beds">Total beds</Label>
            <Input
              id="hospital-beds"
              type="number"
              min={0}
              aria-invalid={!!errors.totalBeds}
              {...form.register("totalBeds")}
            />
            {errors.totalBeds && (
              <p className="text-destructive text-xs">{errors.totalBeds.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hospital-occupied">Occupied beds</Label>
            <Input
              id="hospital-occupied"
              type="number"
              min={0}
              aria-invalid={!!errors.occupiedBeds}
              {...form.register("occupiedBeds")}
            />
            {errors.occupiedBeds && (
              <p className="text-destructive text-xs">{errors.occupiedBeds.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hospital-icu">ICU beds</Label>
            <Input
              id="hospital-icu"
              type="number"
              min={0}
              aria-invalid={!!errors.icuBeds}
              {...form.register("icuBeds")}
            />
            {errors.icuBeds && (
              <p className="text-destructive text-xs">{errors.icuBeds.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hospital-icu-occupied">Occupied ICU beds</Label>
            <Input
              id="hospital-icu-occupied"
              type="number"
              min={0}
              aria-invalid={!!errors.occupiedIcuBeds}
              {...form.register("occupiedIcuBeds")}
            />
            {errors.occupiedIcuBeds && (
              <p className="text-destructive text-xs">{errors.occupiedIcuBeds.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Operating information</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="hospital-opens">Opens at</Label>
            <Input
              id="hospital-opens"
              type="time"
              aria-invalid={!!errors.opensAt}
              {...form.register("opensAt")}
            />
            {errors.opensAt && (
              <p className="text-destructive text-xs">{errors.opensAt.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hospital-closes">Closes at</Label>
            <Input
              id="hospital-closes"
              type="time"
              aria-invalid={!!errors.closesAt}
              {...form.register("closesAt")}
            />
            {errors.closesAt && (
              <p className="text-destructive text-xs">{errors.closesAt.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Emergency availability</Label>
            <Controller
              control={form.control}
              name="emergencyAvailable"
              render={({ field }) => (
                <ToggleChip active={field.value} onClick={() => field.onChange(!field.value)}>
                  {field.value ? "24/7 emergency available" : "No emergency service"}
                </ToggleChip>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Working days</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <ToggleChip
                key={day}
                active={workingDays.includes(day)}
                onClick={() => toggleWorkingDay(day)}
              >
                {WEEKDAY_LABELS[day]}
              </ToggleChip>
            ))}
          </div>
          {errors.workingDays && (
            <p className="text-destructive text-xs">{errors.workingDays.message}</p>
          )}
        </div>
      </section>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : "Save hospital information"}
      </Button>
    </form>
  );
}
