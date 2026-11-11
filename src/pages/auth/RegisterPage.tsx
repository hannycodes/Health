import { useState } from "react";
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/auth/PasswordField";
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
import { getApiErrorMessage } from "@/lib/http";

const PHONE_ALLOWED = /[0-9+()\s-]/;

const measurement = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      `${label} must be between ${min} and ${max}`,
    );

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Enter your full name")
      .regex(
        /^[\p{L}][\p{L}'’.-]*(?:\s[\p{L}'’.-]+)*$/u,
        "Use letters only for your name",
      ),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .min(7, "Enter a valid phone number")
      .regex(/^[+0-9][0-9\s()-]{6,18}$/, "Use digits, spaces, + or -"),
    age: measurement("Age", 1, 120),
    weightKg: measurement("Weight", 20, 300),
    heightCm: measurement("Height", 50, 250),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    medicalHistory: z.string().trim().max(1000).optional(),
    allergies: z.string().trim().max(500).optional(),
    currentMedications: z.string().trim().max(500).optional(),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptedTerms: z
      .boolean()
      .refine((value) => value, "You must accept the terms of service"),
    acceptedPrivacy: z
      .boolean()
      .refine((value) => value, "You must acknowledge the privacy notice"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { registerPatient } = useAuth();
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      age: "",
      weightKg: "",
      heightCm: "",
      dateOfBirth: "",
      gender: undefined,
      medicalHistory: "",
      allergies: "",
      currentMedications: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
      acceptedPrivacy: false,
    },
  });

  async function onSubmit(values: RegisterValues) {
    try {
      const result = await registerPatient({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        age: Number(values.age),
        weightKg: Number(values.weightKg),
        heightCm: Number(values.heightCm),
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender,
        medicalHistory: values.medicalHistory?.trim() || undefined,
        allergies: values.allergies?.trim() || undefined,
        currentMedications: values.currentMedications?.trim() || undefined,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
        acceptedPrivacy: values.acceptedPrivacy,
      });
      setCreatedEmail(result.user.email);
      toast.success("Your patient account has been created.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (createdEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
            Account created
          </CardTitle>
          <CardDescription>
            We created your MyHealth patient account for {createdEmail}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Sign in with the password you chose to reach your patient dashboard.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Continue to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your patient account</CardTitle>
        <CardDescription>
          Doctors, hospital administrators and platform staff are onboarded
          through their organisation — not this form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/40 mb-5 space-y-2 rounded-lg border p-3 text-xs leading-relaxed">
          <p className="text-sm font-medium">Who registers where</p>
          <p>
            <span className="font-medium">Patients</span> — create your account
            below to book appointments and keep your medical history in one place.
          </p>
          <p>
            <span className="font-medium">Doctors</span> — shift cover is arranged
            with the hospital that needs it. The platform administrator verifies
            your licence and documents before you can take shifts, then you sign in
            with the account they set up.
          </p>
          <p>
            <span className="font-medium">Hospitals</span> — request onboarding
            through the platform administrator. Once the hospital is verified, its
            team can post shift cover and manage appointments.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="e.g. Abebe Tesfaye"
              aria-invalid={!!form.formState.errors.fullName}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName && (
              <p className="text-destructive text-xs">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+251 911 234 567"
                aria-invalid={!!form.formState.errors.phone}
                onKeyDown={(event) => {
                  if (event.key.length === 1 && !PHONE_ALLOWED.test(event.key)) {
                    event.preventDefault();
                  }
                }}
                onInput={(event) => {
                  const target = event.currentTarget;
                  const cleaned = target.value.replace(/[^0-9+()\s-]/g, "");
                  if (cleaned !== target.value) {
                    target.value = cleaned;
                  }
                }}
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...form.register("dateOfBirth")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender (optional)</Label>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) =>
                      field.onChange(value === "" ? undefined : value)
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Prefer not to say" />
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
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Health profile</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  placeholder="32"
                  aria-invalid={!!form.formState.errors.age}
                  {...form.register("age")}
                />
                {form.formState.errors.age && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.age.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  inputMode="numeric"
                  min={20}
                  max={300}
                  placeholder="70"
                  aria-invalid={!!form.formState.errors.weightKg}
                  {...form.register("weightKg")}
                />
                {form.formState.errors.weightKg && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.weightKg.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={250}
                  placeholder="170"
                  aria-invalid={!!form.formState.errors.heightCm}
                  {...form.register("heightCm")}
                />
                {form.formState.errors.heightCm && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.heightCm.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medicalHistory">Critical medical history</Label>
              <Textarea
                id="medicalHistory"
                rows={3}
                placeholder="Chronic conditions, past surgeries or anything your doctor should know. Write “None” if not applicable."
                {...form.register("medicalHistory")}
              />
              <p className="text-muted-foreground text-xs">
                Your age, weight and height help clinicians interpret your vital
                signs. You can update these later from your profile.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="allergies">Known allergies (optional)</Label>
                <Input
                  id="allergies"
                  placeholder="Medication, food or other allergies"
                  {...form.register("allergies")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentMedications">Current medications (optional)</Label>
                <Input
                  id="currentMedications"
                  placeholder="Medicines you take regularly"
                  {...form.register("currentMedications")}
                />
              </div>
            </div>
          </div>

          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters, including a letter and a number."
            error={form.formState.errors.password?.message}
            {...form.register("password")}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Consent</p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary mt-0.5 size-4 rounded border"
                {...form.register("acceptedTerms")}
              />
              <span>
                I accept the MyHealth terms of service.
                {form.formState.errors.acceptedTerms && (
                  <span className="text-destructive block text-xs">
                    {form.formState.errors.acceptedTerms.message}
                  </span>
                )}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary mt-0.5 size-4 rounded border"
                {...form.register("acceptedPrivacy")}
              />
              <span>
                I have read the privacy notice and consent to MyHealth handling
                my health information for care coordination.
                {form.formState.errors.acceptedPrivacy && (
                  <span className="text-destructive block text-xs">
                    {form.formState.errors.acceptedPrivacy.message}
                  </span>
                )}
              </span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            <UserPlus className="size-4" />
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Already registered?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
