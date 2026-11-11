import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { SPECIALTIES, type Department, type Doctor } from "@/types";

const numberField = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine((value) => /^\d+(\.\d+)?$/.test(value.trim()), "Enter a number");

const doctorSchema = z.object({
  fullName: z.string().min(3, "Enter the doctor's full name"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
  phone: z
    .string()
    .regex(/^$|^[+\d][\d\s-]{6,}$/, "Enter a valid phone number")
    .optional(),
  specialty: z.enum(SPECIALTIES),
  departmentId: z.string().optional(),
  licenseNumber: z.string().min(4, "Enter the professional licence number"),
  yearsExperience: numberField("Enter years of experience"),
  consultationFee: numberField("Enter the consultation fee"),
  bio: z.string().min(20, "Write a short professional biography of 20+ characters"),
  isAcceptingPatients: z.enum(["YES", "NO"]),
});

type DoctorValues = z.infer<typeof doctorSchema>;

interface DoctorFormProps {
  hospitalId: string;
  departments: Department[];
  doctor?: Doctor;
  onSaved?: (doctor: Doctor) => void;
}

/**
 * Doctor registration and editing.
 *
 * The hospital is never a form field: it is resolved from the signed-in
 * administrator, so a doctor can only ever be registered under their hospital.
 * The professional licence number is locked after registration because
 * credential changes follow a separate verification workflow.
 */
export function DoctorForm({ hospitalId, departments, doctor, onSaved }: DoctorFormProps) {
  const isEdit = Boolean(doctor);

  const form = useForm<DoctorValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      fullName: doctor?.fullName ?? "",
      email: doctor?.email ?? "",
      phone: doctor?.phone ?? "",
      specialty: doctor?.specialty ?? "General Medicine",
      departmentId: doctor?.departmentId ?? "NONE",
      licenseNumber: doctor?.licenseNumber ?? "",
      yearsExperience: doctor ? String(doctor.yearsExperience) : "",
      consultationFee: doctor ? String(doctor.consultationFee) : "",
      bio: doctor?.bio ?? "",
      isAcceptingPatients: doctor?.isAcceptingPatients ? "YES" : "NO",
    },
  });

  const errors = form.formState.errors;
  const activeDepartments = departments.filter((department) => department.status === "ACTIVE");

  async function onSubmit(values: DoctorValues) {
    const departmentId =
      values.departmentId && values.departmentId !== "NONE" ? values.departmentId : undefined;

    try {
      const saved = doctor
        ? await services.doctors.update(doctor.id, {
            fullName: values.fullName.trim(),
            phone: values.phone?.trim() || undefined,
            specialty: values.specialty,
            departmentId,
            yearsExperience: Number(values.yearsExperience),
            consultationFee: Number(values.consultationFee),
            bio: values.bio.trim(),
            isAcceptingPatients: values.isAcceptingPatients === "YES",
          })
        : await services.doctors.create({
            hospitalId,
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone?.trim() || undefined,
            specialty: values.specialty,
            departmentId,
            licenseNumber: values.licenseNumber.trim(),
            yearsExperience: Number(values.yearsExperience),
            consultationFee: Number(values.consultationFee),
            bio: values.bio.trim(),
          });

      toast.success(
        doctor
          ? "Doctor profile updated."
          : "Doctor registered. An account invitation is now pending.",
      );
      if (!doctor) form.reset();
      onSaved?.(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Personal information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="doctor-name">Full name</Label>
            <Input
              id="doctor-name"
              aria-invalid={!!errors.fullName}
              placeholder="Dr. Full Name"
              {...form.register("fullName")}
            />
            {errors.fullName && (
              <p className="text-destructive text-xs">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-email">Email</Label>
            <Input
              id="doctor-email"
              type="email"
              aria-invalid={!!errors.email}
              disabled={isEdit}
              placeholder="doctor@example.com"
              {...form.register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
            {isEdit && (
              <p className="text-muted-foreground text-xs">
                Sign-in email is managed through the shared account settings.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-phone">Phone number</Label>
            <Input
              id="doctor-phone"
              aria-invalid={!!errors.phone}
              placeholder="+251 ..."
              {...form.register("phone")}
            />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Professional information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="doctor-specialty">Specialty</Label>
            <Controller
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="doctor-specialty">
                    <SelectValue placeholder="Select a specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-department">Department</Label>
            <Controller
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <Select value={field.value ?? "NONE"} onValueChange={field.onChange}>
                  <SelectTrigger id="doctor-department">
                    <SelectValue placeholder="Assign a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Unassigned</SelectItem>
                    {activeDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {activeDepartments.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No active departments yet — create one before assigning the doctor.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-license">Licence number</Label>
            <Input
              id="doctor-license"
              aria-invalid={!!errors.licenseNumber}
              disabled={isEdit}
              placeholder="ET-MD-00000"
              {...form.register("licenseNumber")}
            />
            {errors.licenseNumber && (
              <p className="text-destructive text-xs">{errors.licenseNumber.message}</p>
            )}
            {isEdit && (
              <p className="text-muted-foreground text-xs">
                Verified credentials can only change through the platform verification
                workflow.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-experience">Years of experience</Label>
            <Input
              id="doctor-experience"
              type="number"
              min={0}
              max={60}
              aria-invalid={!!errors.yearsExperience}
              {...form.register("yearsExperience")}
            />
            {errors.yearsExperience && (
              <p className="text-destructive text-xs">{errors.yearsExperience.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctor-fee">Consultation fee (ETB)</Label>
            <Input
              id="doctor-fee"
              type="number"
              min={0}
              aria-invalid={!!errors.consultationFee}
              {...form.register("consultationFee")}
            />
            {errors.consultationFee && (
              <p className="text-destructive text-xs">{errors.consultationFee.message}</p>
            )}
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="doctor-accepting">Accepting new patients</Label>
              <Controller
                control={form.control}
                name="isAcceptingPatients"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="doctor-accepting">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">Accepting patients</SelectItem>
                      <SelectItem value="NO">Not accepting patients</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doctor-bio">Professional biography</Label>
          <Textarea
            id="doctor-bio"
            rows={4}
            aria-invalid={!!errors.bio}
            placeholder="Clinical focus, sub-specialties and experience"
            {...form.register("bio")}
          />
          {errors.bio && <p className="text-destructive text-xs">{errors.bio.message}</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Hospital assignment</h3>
        <p className="text-muted-foreground text-sm">
          This doctor will be registered at the hospital linked to your administrator
          account. The hospital cannot be changed from this form.
        </p>
      </section>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? "Saving…"
          : isEdit
            ? "Save changes"
            : "Register doctor"}
      </Button>
    </form>
  );
}
