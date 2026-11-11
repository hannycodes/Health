import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { Patient } from "@/types";
import {
  BMI_EXPLANATION,
  MAX_HEIGHT_CM,
  MAX_WEIGHT_KG,
  MIN_HEIGHT_CM,
  MIN_WEIGHT_KG,
  bmiCategory,
  calculateAge,
  calculateBmi,
} from "@/utils/health";

const measurement = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max),
      `${label} must be a number between ${min} and ${max}`,
    );

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(`${value}T00:00:00`).getTime()),
      "Enter a valid date of birth",
    )
    .refine((value) => !value || value < new Date().toISOString().slice(0, 10), "Date of birth must be in the past"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodType: z.string().trim().optional(),
  address: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  weightKg: measurement("Weight", MIN_WEIGHT_KG, MAX_WEIGHT_KG),
  heightCm: measurement("Height", MIN_HEIGHT_CM, MAX_HEIGHT_CM),
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  medicalNotes: z.string().max(500, "Keep notes under 500 characters").optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

function splitList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toValues(patient: Patient): ProfileValues {
  return {
    fullName: patient.fullName,
    phone: patient.phone ?? "",
    dateOfBirth: patient.dateOfBirth ?? "",
    gender: patient.gender,
    bloodType: patient.bloodType ?? "",
    address: patient.address ?? "",
    emergencyContact: patient.emergencyContact ?? "",
    weightKg: patient.weightKg !== undefined ? String(patient.weightKg) : "",
    heightCm: patient.heightCm !== undefined ? String(patient.heightCm) : "",
    allergies: patient.allergies?.join(", ") ?? "",
    conditions: patient.conditions?.join(", ") ?? "",
    medications: patient.medications?.join(", ") ?? "",
    medicalNotes: patient.medicalNotes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

function ProfileForm({ patient }: { patient: Patient }) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toValues(patient),
  });

  const weight = form.watch("weightKg");
  const height = form.watch("heightCm");
  const dateOfBirth = form.watch("dateOfBirth");

  const bmi = calculateBmi(
    weight ? Number(weight) : undefined,
    height ? Number(height) : undefined,
  );
  const age = calculateAge(dateOfBirth);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.formState.isDirty]);

  async function onSubmit(values: ProfileValues) {
    try {
      const updated = await services.patients.update(patient.id, {
        fullName: values.fullName,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender,
        bloodType: values.bloodType || undefined,
        address: values.address || undefined,
        emergencyContact: values.emergencyContact || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        allergies: splitList(values.allergies),
        conditions: splitList(values.conditions),
        medications: splitList(values.medications),
        medicalNotes: values.medicalNotes || undefined,
      });
      form.reset(toValues(updated));
      toast.success("Profile saved. The AI Assistant will use your latest details.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>
            Keep your contact details current so appointments reach you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                aria-invalid={!!form.formState.errors.fullName}
                {...form.register("fullName")}
              />
              <FieldError message={form.formState.errors.fullName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={patient.email} disabled />
              <p className="text-muted-foreground text-xs">
                Email changes are handled by account support.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                aria-invalid={!!form.formState.errors.phone}
                {...form.register("phone")}
              />
              <FieldError message={form.formState.errors.phone?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                aria-invalid={!!form.formState.errors.dateOfBirth}
                {...form.register("dateOfBirth")}
              />
              <p className="text-muted-foreground text-xs">
                {age !== undefined ? `You are ${age} years old.` : "Age is calculated from this date."}
              </p>
              <FieldError message={form.formState.errors.dateOfBirth?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloodType">Blood type</Label>
              <Input id="bloodType" placeholder="e.g. O+" {...form.register("bloodType")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Sub-city, city" {...form.register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergencyContact">Emergency contact</Label>
            <Input
              id="emergencyContact"
              placeholder="Name and phone number"
              {...form.register("emergencyContact")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Physical health</CardTitle>
          <CardDescription>
            Age, weight and height give the AI Assistant the context it needs. Only
            fields you save are shared with it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                inputMode="decimal"
                min={MIN_WEIGHT_KG}
                max={MAX_WEIGHT_KG}
                step="0.1"
                placeholder="e.g. 72"
                aria-invalid={!!form.formState.errors.weightKg}
                {...form.register("weightKg")}
              />
              <FieldError message={form.formState.errors.weightKg?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                inputMode="decimal"
                min={MIN_HEIGHT_CM}
                max={MAX_HEIGHT_CM}
                step="0.1"
                placeholder="e.g. 174"
                aria-invalid={!!form.formState.errors.heightCm}
                {...form.register("heightCm")}
              />
              <FieldError message={form.formState.errors.heightCm?.message} />
            </div>
          </div>

          <div className="bg-secondary/50 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Activity className="text-primary size-4" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium tracking-wide uppercase">
                  Body mass index
                </p>
                <p className="text-sm font-semibold">
                  {bmi !== null ? bmi.toFixed(1) : "Add weight and height"}
                </p>
              </div>
            </div>
            {bmi !== null && (
              <p className="text-muted-foreground text-xs">{bmiCategory(bmi)}</p>
            )}
          </div>
          <p className="text-muted-foreground text-[11px]">{BMI_EXPLANATION}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="allergies">Known allergies</Label>
              <Input
                id="allergies"
                placeholder="Comma separated, e.g. Penicillin, peanuts"
                {...form.register("allergies")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditions">Existing conditions</Label>
              <Input
                id="conditions"
                placeholder="Comma separated, e.g. Asthma"
                {...form.register("conditions")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medications">Current medications</Label>
            <Input
              id="medications"
              placeholder="Comma separated, e.g. Amlodipine 5mg daily"
              {...form.register("medications")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medicalNotes">Notes for your care team</Label>
            <Textarea
              id="medicalNotes"
              rows={3}
              placeholder="Anything else a clinician should know (optional)"
              aria-invalid={!!form.formState.errors.medicalNotes}
              {...form.register("medicalNotes")}
            />
            <FieldError message={form.formState.errors.medicalNotes?.message} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save changes"}
        </Button>
        {form.formState.isDirty && (
          <p className="text-muted-foreground text-xs">You have unsaved changes.</p>
        )}
      </div>
    </form>
  );
}

export function PatientProfile() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.patients.getByUserId(user?.id ?? ""),
    user?.id ?? "",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your personal details and health profile. These values give the AI Assistant relevant context."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Profile" }]}
      />

      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <ProfileForm patient={data} />
      ) : (
        <ErrorState title="Profile unavailable" message="No patient profile was found." />
      )}
    </div>
  );
}
