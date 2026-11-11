import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, CheckCircle2 } from "lucide-react";

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

const PHONE_ALLOWED = /[0-9+()\s-]/;

const schema = z.object({
  hospitalName: z.string().trim().min(3, "Enter the hospital name"),
  city: z.string().trim().min(2, "Enter the city"),
  representativeName: z
    .string()
    .trim()
    .min(3, "Enter the representative's full name")
    .regex(
      /^[\p{L}][\p{L}'’.-]*(?:\s[\p{L}'’.-]+)*$/u,
      "Use letters only for the name",
    ),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[+0-9][0-9\s()-]{6,18}$/, "Use digits, spaces, + or -"),
  website: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
});

type Values = z.infer<typeof schema>;

export function HospitalApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      hospitalName: "",
      city: "",
      representativeName: "",
      email: "",
      phone: "",
      website: "",
      notes: "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const response = await fetch("/api/applications/hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error("We could not submit your request. Please try again.");
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your request.",
      );
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
            Request received
          </CardTitle>
          <CardDescription>
            Your hospital onboarding request is awaiting verification by the platform
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            The administrator will review your hospital's licence and documents.
            Once approved, your team receives accounts for the hospital workspace.
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
        <CardTitle className="text-xl">Apply to onboard your hospital</CardTitle>
        <CardDescription>
          Hospitals are verified before joining. The platform administrator reviews
          your licence and documents, then sets up your team's accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hospitalName">Hospital name</Label>
              <Input id="hospitalName" {...form.register("hospitalName")} />
              {form.formState.errors.hospitalName && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.hospitalName.message}
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
            <div className="space-y-1.5">
              <Label htmlFor="representativeName">Representative name</Label>
              <Input
                id="representativeName"
                autoComplete="name"
                {...form.register("representativeName")}
              />
              {form.formState.errors.representativeName && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.representativeName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
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
              <Label htmlFor="website">Website (optional)</Label>
              <Input id="website" placeholder="https://" {...form.register("website")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Licence or accreditation notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Licence numbers and documents you can provide"
              {...form.register("notes")}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <Building2 className="size-4" />
            {form.formState.isSubmitting ? "Submitting…" : "Submit request"}
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
