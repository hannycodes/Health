import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/branding/Logo";
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

import { loginProfessional, registerProfessional, useWorkforce } from "./store";
import {
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  type ProfessionalCategory,
} from "./types";

function WorkforceAuthShell({
  children,
  heading,
  description,
}: {
  children: React.ReactNode;
  heading: string;
  description: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <div className="bg-surface-dark relative hidden flex-col justify-between p-10 text-white lg:flex">
        <Logo size="md" to="/workforce" onDark />
        <div className="space-y-6">
          <h2 className="max-w-sm text-3xl leading-tight font-semibold">
            Where clinical expertise meets the hospitals that need it.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            Build one professional profile, discover matched opportunities and manage every
            application, interview and assignment in one place.
          </p>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-emerald-300" />
              Professional profiles with verified credentials
            </li>
            <li className="flex items-center gap-2">
              <BellRing className="size-4 text-emerald-300" />
              Opportunity alerts matched to your specialty
            </li>
            <li className="flex items-center gap-2">
              <BriefcaseBusiness className="size-4 text-emerald-300" />
              Permanent roles and temporary shift cover
            </li>
          </ul>
        </div>
        <p className="text-xs text-white/40">
          MyHealth Workforce · Healthcare recruitment and staffing
        </p>
      </div>

      <div className="bg-background flex flex-col">
        <div className="flex h-16 items-center justify-between px-5 lg:hidden">
          <Logo size="sm" to="/workforce" />
          <Link to="/" className="text-muted-foreground text-xs hover:underline">
            MyHealth home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Login                                    */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function WorkforceLoginPage() {
  const { professional } = useWorkforce();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = usePasswordVisibility();
  const [error, setError] = useErrorState();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (professional) return <Navigate to="/workforce/dashboard" replace />;

  function onSubmit(values: LoginValues) {
    setError(null);
    try {
      loginProfessional(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? "/workforce/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    }
  }

  return (
    <WorkforceAuthShell
      heading="Welcome back"
      description="Sign in to your MyHealth Workforce professional account."
    >
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pr-10 pl-9"
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              Sign in
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            New to MyHealth Workforce?{" "}
            <Link
              to="/workforce/register"
              className="text-primary font-medium hover:underline"
            >
              Create a professional profile
            </Link>
          </p>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Hospital administrator?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in to your facility account
            </Link>
          </p>
        </CardContent>
      </Card>
    </WorkforceAuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Register                                  */
/* -------------------------------------------------------------------------- */

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    city: z.string().min(1, "City is required"),
    region: z.string().min(1, "Region is required"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    category: z.string().min(1, "Choose a professional category"),
    specialty: z.string().min(2, "Enter your specialty"),
    title: z.string().optional(),
    yearsExperience: z
      .string()
      .min(1, "Years of experience is required")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Enter a valid number"),
    education: z.string().min(2, "Enter your qualification"),
    institution: z.string().min(2, "Enter your institution"),
    graduationYear: z
      .string()
      .refine(
        (value) => /^\d{4}$/.test(value) && Number(value) >= 1960 && Number(value) <= new Date().getFullYear() + 1,
        "Enter a valid graduation year",
      ),
    licenseNumber: z.string().min(3, "Enter your professional licence number"),
    languages: z.string().min(2, "Add at least one language"),
    bio: z.string().min(40, "Write at least 40 characters about your practice"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const REGIONS = [
  "Addis Ababa",
  "Amhara",
  "Dire Dawa",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "Tigray",
];

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { label: "Weak", width: "w-1/3", tone: "bg-red-500" };
  if (score <= 4) return { label: "Good", width: "w-2/3", tone: "bg-amber-500" };
  return { label: "Strong", width: "w-full", tone: "bg-emerald-500" };
}

export function WorkforceRegisterPage() {
  const { professional } = useWorkforce();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = usePasswordVisibility();
  const [showConfirm, setShowConfirm] = usePasswordVisibility();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      region: "Addis Ababa",
      password: "",
      confirmPassword: "",
      category: "GENERAL_PRACTITIONER",
      specialty: "",
      title: "",
      yearsExperience: "",
      education: "",
      institution: "",
      graduationYear: "",
      licenseNumber: "",
      languages: "English, Amharic",
      bio: "",
    },
  });

  const password = form.watch("password");
  const strength = useMemo(() => passwordStrength(password), [password]);

  if (professional) return <Navigate to="/workforce/dashboard" replace />;

  function onSubmit(values: RegisterValues) {
    try {
      registerProfessional({
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        city: values.city,
        region: values.region,
        password: values.password,
        category: values.category as ProfessionalCategory,
        specialty: values.specialty,
        title: values.title ?? "",
        yearsExperience: Number(values.yearsExperience),
        education: values.education,
        institution: values.institution,
        graduationYear: Number(values.graduationYear),
        licenseNumber: values.licenseNumber,
        languages: values.languages.split(",").map((language) => language.trim()).filter(Boolean),
        bio: values.bio,
      });
      toast.success("Your professional profile is ready.");
      navigate("/workforce/dashboard", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create your profile.");
    }
  }

  const fieldError = (name: keyof RegisterValues) => form.formState.errors[name]?.message;

  return (
    <WorkforceAuthShell
      heading="Join MyHealth Workforce"
      description="Create a professional profile to discover roles and temporary shifts that match your expertise."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
            <CardDescription>How hospitals can reach you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" aria-invalid={!!fieldError("firstName")} {...form.register("firstName")} />
              {fieldError("firstName") && <p className="text-destructive text-xs">{fieldError("firstName")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="middleName">Middle name (optional)</Label>
              <Input id="middleName" {...form.register("middleName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" aria-invalid={!!fieldError("lastName")} {...form.register("lastName")} />
              {fieldError("lastName") && <p className="text-destructive text-xs">{fieldError("lastName")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" placeholder="+251 911 000 000" {...form.register("phone")} />
              {fieldError("phone") && <p className="text-destructive text-xs">{fieldError("phone")}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {fieldError("email") && <p className="text-destructive text-xs">{fieldError("email")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} />
              {fieldError("city") && <p className="text-destructive text-xs">{fieldError("city")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <Controller
                control={form.control}
                name="region"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!fieldError("password")}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div className={`h-full ${strength.width} ${strength.tone} transition-all`} />
                  </div>
                  <p className="text-muted-foreground text-[11px]">Password strength: {strength.label}</p>
                </div>
              )}
              {fieldError("password") && <p className="text-destructive text-xs">{fieldError("password")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!fieldError("confirmPassword")}
                  {...form.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldError("confirmPassword") && (
                <p className="text-destructive text-xs">{fieldError("confirmPassword")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional information</CardTitle>
            <CardDescription>
              This information is used to match you with relevant opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Professional category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFESSIONAL_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {PROFESSIONAL_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" placeholder="e.g. Emergency Nursing" {...form.register("specialty")} />
              {fieldError("specialty") && <p className="text-destructive text-xs">{fieldError("specialty")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Professional title (optional)</Label>
              <Input id="title" placeholder="Dr., Sr., Mr., Ms." {...form.register("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input id="yearsExperience" type="number" min={0} max={60} {...form.register("yearsExperience")} />
              {fieldError("yearsExperience") && (
                <p className="text-destructive text-xs">{fieldError("yearsExperience")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="education">Education / qualification</Label>
              <Input id="education" placeholder="e.g. BSc Nursing" {...form.register("education")} />
              {fieldError("education") && <p className="text-destructive text-xs">{fieldError("education")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="institution">Institution</Label>
              <Input id="institution" {...form.register("institution")} />
              {fieldError("institution") && <p className="text-destructive text-xs">{fieldError("institution")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="graduationYear">Graduation year</Label>
              <Input id="graduationYear" inputMode="numeric" placeholder="2019" {...form.register("graduationYear")} />
              {fieldError("graduationYear") && (
                <p className="text-destructive text-xs">{fieldError("graduationYear")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber">Professional licence number</Label>
              <Input id="licenseNumber" {...form.register("licenseNumber")} />
              {fieldError("licenseNumber") && (
                <p className="text-destructive text-xs">{fieldError("licenseNumber")}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="languages">Languages</Label>
              <Input id="languages" placeholder="English, Amharic" {...form.register("languages")} />
              <p className="text-muted-foreground text-[11px]">Separate languages with commas.</p>
              {fieldError("languages") && <p className="text-destructive text-xs">{fieldError("languages")}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">Professional biography</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Describe your clinical experience, strengths and the kind of work you are looking for."
                {...form.register("bio")}
              />
              {fieldError("bio") && <p className="text-destructive text-xs">{fieldError("bio")}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            <CheckCircle2 className="size-4" />
            Create professional profile
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Your licence details are submitted for review. You can explore and apply while
            verification is completed.
          </p>
          <p className="text-muted-foreground text-center text-sm">
            Already registered?{" "}
            <Link to="/workforce/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </WorkforceAuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function usePasswordVisibility() {
  return useState(false);
}

function useErrorState() {
  return useState<string | null>(null);
}

export function WorkforceAuthLink() {
  return (
    <div className="bg-brand-mint/50 border-primary/10 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="bg-background text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Stethoscope className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Looking for healthcare opportunities?</p>
          <p className="text-muted-foreground text-xs">
            MyHealth Workforce connects professionals with hospitals across the country.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to="/workforce">
          Explore workforce
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function WorkforceBackLink() {
  return (
    <Link
      to="/workforce"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
    >
      <ArrowLeft className="size-3.5" />
      Back to MyHealth Workforce
    </Link>
  );
}
