import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Stethoscope } from "lucide-react";

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
import { SPECIALTIES } from "@/types";

const PHONE_ALLOWED = /[0-9+()\s-]/;

const schema = z.object({
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
  licenseNumber: z.string().trim().min(3, "Enter your medical licence number"),
  specialty: z.enum(SPECIALTIES, "Choose your specialty"),
  yearsExperience: z
    .string()
    .trim()
    .min(1, "Enter your years of experience")
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) <= 60,
      "Enter a number between 0 and 60",
    ),
  city: z.string().trim().min(2, "Enter the city you work in"),
  notes: z.string().trim().max(500).optional(),
});

type Values = z.infer<typeof schema>;

export function DoctorApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      licenseNumber: "",
      specialty: undefined,
      yearsExperience: "",
      city: "",
      notes: "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const response = await fetch("/api/applications/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          yearsExperience: Number(values.yearsExperience),
        }),
      });
      if (!response.ok) {
        throw new Error("We could not submit your application. Please try again.");
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your application.",
      );
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
            Application received
          </CardTitle>
          <CardDescription>
            Your shift-cover application is awaiting verification by the platform
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            We will review your licence and documents first. Once verified, you will
            receive an account you can use to sign in and pick up shifts.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Apply to cover shifts</CardTitle>
        <CardDescription>
          Doctors join MyHealth as verified shift cover. The platform administrator
          checks your licence and documents before you can take shifts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <p className="text-destructive text-xs">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
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
                onKeyDown={(event) => {
                  if (event.key.length === 1 && !PHONE_ALLOWED.test(event.key)) {
                    event.preventDefault();
                  }
                }}
                onInput={(event) => {
                  const target = event.currentTarget;
                  const cleaned = target.value.replace(/[^0-9+()\s-]/g, "");
                  if (cleaned !== target.value) target.value = cleaned;
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
              <Label htmlFor="licenseNumber">Medical licence number</Label>
              <Input id="licenseNumber" placeholder="ET-MD-10231" {...form.register("licenseNumber")} />
              {form.formState.errors.licenseNumber && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.licenseNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={form.watch("specialty") ?? ""}
                onValueChange={(value) =>
                  form.setValue("specialty", value as Values["specialty"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="specialty">
                  <SelectValue placeholder="Choose a specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.specialty && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.specialty.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                {...form.register("yearsExperience")}
              />
              {form.formState.errors.yearsExperience && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.yearsExperience.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Addis Ababa" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Availability or notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. weekday evenings, on-call weekends"
              {...form.register("notes")}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <Stethoscope className="size-4" />
            {form.formState.isSubmitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link to="/register" className="text-primary font-medium hover:underline">
            Choose a different account type
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
