import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SPECIALTIES, type Doctor } from "@/types";

export const doctorProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().trim().max(40),
  specialty: z.enum(SPECIALTIES),
  yearsExperience: z
    .number({ message: "Enter a number of years." })
    .min(0, "Experience cannot be negative.")
    .max(60, "Enter a realistic number of years."),
  consultationFee: z
    .number({ message: "Enter a consultation fee." })
    .min(0, "Fee cannot be negative.")
    .max(100000, "Fee looks too high."),
  bio: z.string().trim().max(600, "Keep the biography under 600 characters."),
  isAcceptingPatients: z.boolean(),
});

export type DoctorProfileValues = z.infer<typeof doctorProfileSchema>;

interface DoctorProfileFormProps {
  doctor: Doctor;
  isSubmitting: boolean;
  onSubmit: (values: DoctorProfileValues) => Promise<void>;
}

export function DoctorProfileForm({ doctor, isSubmitting, onSubmit }: DoctorProfileFormProps) {
  const form = useForm<DoctorProfileValues>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: {
      fullName: doctor.fullName,
      phone: doctor.phone ?? "",
      specialty: doctor.specialty,
      yearsExperience: doctor.yearsExperience,
      consultationFee: doctor.consultationFee,
      bio: doctor.bio,
      isAcceptingPatients: doctor.isAcceptingPatients,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Professional profile</CardTitle>
        <p className="text-muted-foreground text-xs">
          License {doctor.licenseNumber} · Rating {doctor.rating.toFixed(1)} · Managed by the
          platform, not editable here.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                aria-invalid={Boolean(form.formState.errors.fullName)}
                {...form.register("fullName")}
              />
              {form.formState.errors.fullName && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact phone</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={form.watch("specialty")}
                onValueChange={(value) =>
                  form.setValue("specialty", value as DoctorProfileValues["specialty"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="specialty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min={0}
                max={60}
                aria-invalid={Boolean(form.formState.errors.yearsExperience)}
                {...form.register("yearsExperience", { valueAsNumber: true })}
              />
              {form.formState.errors.yearsExperience && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.yearsExperience.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consultationFee">Consultation fee (ETB)</Label>
              <Input
                id="consultationFee"
                type="number"
                min={0}
                aria-invalid={Boolean(form.formState.errors.consultationFee)}
                {...form.register("consultationFee", { valueAsNumber: true })}
              />
              {form.formState.errors.consultationFee && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.consultationFee.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="isAcceptingPatients">Accepting new patients</Label>
              <Select
                value={form.watch("isAcceptingPatients") ? "yes" : "no"}
                onValueChange={(value) =>
                  form.setValue("isAcceptingPatients", value === "yes", {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="isAcceptingPatients">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — accepting patients</SelectItem>
                  <SelectItem value="no">No — not accepting patients</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Professional biography</Label>
            <Textarea
              id="bio"
              rows={4}
              aria-invalid={Boolean(form.formState.errors.bio)}
              {...form.register("bio")}
            />
            {form.formState.errors.bio && (
              <p className="text-destructive text-xs">{form.formState.errors.bio.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
