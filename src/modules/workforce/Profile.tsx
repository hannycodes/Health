import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileCheck2,
  GraduationCap,
  Plus,
  Save,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/utils/format";

import { VerificationBadge } from "./components";
import {
  addCredential,
  profileCompletion,
  updateProfessional,
  useWorkforce,
} from "./store";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  type EmploymentType,
  type ProfessionalCategory,
} from "./types";

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

export function ProfessionalProfilePage() {
  const { professional } = useWorkforce();
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [credential, setCredential] = useState({
    name: "",
    issuer: "",
    issuedAt: "",
    expiresAt: "",
  });

  const [details, setDetails] = useState(() => ({
    firstName: professional?.firstName ?? "",
    middleName: professional?.middleName ?? "",
    lastName: professional?.lastName ?? "",
    title: professional?.title ?? "",
    phone: professional?.phone ?? "",
    city: professional?.city ?? "",
    region: professional?.region ?? "",
    specialty: professional?.specialty ?? "",
    category: professional?.category ?? "GENERAL_PRACTITIONER",
    yearsExperience: String(professional?.yearsExperience ?? 0),
    education: professional?.education ?? "",
    institution: professional?.institution ?? "",
    graduationYear: String(professional?.graduationYear ?? ""),
    licenseNumber: professional?.licenseNumber ?? "",
    languages: professional?.languages.join(", ") ?? "",
    bio: professional?.bio ?? "",
  }));

  const [preferences, setPreferences] = useState(() => ({
    locations: professional?.preferences.locations.join(", ") ?? "",
    employmentTypes: professional?.preferences.employmentTypes ?? ([] as EmploymentType[]),
    expectedSalary: String(professional?.preferences.expectedSalary ?? ""),
    availability: professional?.preferences.availability ?? "",
    departments: professional?.preferences.departments.join(", ") ?? "",
  }));

  if (!professional) return null;

  const completion = profileCompletion(professional);

  function saveDetails() {
    updateProfessional(professional!.id, {
      firstName: details.firstName.trim(),
      middleName: details.middleName.trim() || undefined,
      lastName: details.lastName.trim(),
      title: details.title.trim(),
      phone: details.phone.trim(),
      city: details.city.trim(),
      region: details.region.trim(),
      specialty: details.specialty.trim(),
      category: details.category as ProfessionalCategory,
      yearsExperience: Number(details.yearsExperience) || 0,
      education: details.education.trim(),
      institution: details.institution.trim(),
      graduationYear: Number(details.graduationYear) || professional!.graduationYear,
      licenseNumber: details.licenseNumber.trim(),
      languages: details.languages.split(",").map((item) => item.trim()).filter(Boolean),
      bio: details.bio.trim(),
    });
    toast.success("Profile updated.");
  }

  function savePreferences() {
    updateProfessional(professional!.id, {
      preferences: {
        locations: preferences.locations.split(",").map((item) => item.trim()).filter(Boolean),
        employmentTypes: preferences.employmentTypes,
        expectedSalary: preferences.expectedSalary ? Number(preferences.expectedSalary) : undefined,
        availability: preferences.availability.trim(),
        departments: preferences.departments.split(",").map((item) => item.trim()).filter(Boolean),
      },
    });
    toast.success("Opportunity preferences updated.");
  }

  function toggleEmploymentType(value: EmploymentType) {
    setPreferences((previous) => ({
      ...previous,
      employmentTypes: previous.employmentTypes.includes(value)
        ? previous.employmentTypes.filter((item) => item !== value)
        : [...previous.employmentTypes, value],
    }));
  }

  function saveCredential() {
    if (!credential.name.trim() || !credential.issuer.trim() || !credential.issuedAt) {
      toast.error("Add the document name, issuer and issue date.");
      return;
    }
    addCredential(professional!.id, {
      name: credential.name.trim(),
      issuer: credential.issuer.trim(),
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt || undefined,
    });
    setCredentialOpen(false);
    setCredential({ name: "", issuer: "", issuedAt: "", expiresAt: "" });
    toast.success("Credential added for review.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Professional profile"
        description="Your profile is shared with hospitals when you apply. Keep qualifications, licence and availability current."
        actions={<VerificationBadge professional={professional} />}
      />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Profile completion</p>
              <p className="text-muted-foreground text-xs">
                Complete profiles help hospitals assess your application faster.
              </p>
            </div>
            <span className="text-lg font-semibold">{completion.percent}%</span>
          </div>
          <Progress value={completion.percent} />
          {completion.missing.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Suggested: {completion.missing.slice(0, 4).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4" />
                Personal and professional details
              </CardTitle>
              <CardDescription>Your identity, contact details and clinical background.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input value={details.firstName} onChange={(event) => setDetails({ ...details, firstName: event.target.value })} />
              </Field>
              <Field label="Middle name">
                <Input value={details.middleName} onChange={(event) => setDetails({ ...details, middleName: event.target.value })} />
              </Field>
              <Field label="Last name">
                <Input value={details.lastName} onChange={(event) => setDetails({ ...details, lastName: event.target.value })} />
              </Field>
              <Field label="Title">
                <Input placeholder="Dr., Sr., Mr., Ms." value={details.title} onChange={(event) => setDetails({ ...details, title: event.target.value })} />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} />
              </Field>
              <Field label="Professional category">
                <Select
                  value={details.category}
                  onValueChange={(value) => setDetails({ ...details, category: value as typeof details.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFESSIONAL_CATEGORIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PROFESSIONAL_CATEGORY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Specialty">
                <Input value={details.specialty} onChange={(event) => setDetails({ ...details, specialty: event.target.value })} />
              </Field>
              <Field label="Years of experience">
                <Input type="number" min={0} value={details.yearsExperience} onChange={(event) => setDetails({ ...details, yearsExperience: event.target.value })} />
              </Field>
              <Field label="City">
                <Input value={details.city} onChange={(event) => setDetails({ ...details, city: event.target.value })} />
              </Field>
              <Field label="Region">
                <Select value={details.region} onValueChange={(value) => setDetails({ ...details, region: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Qualification">
                <Input value={details.education} onChange={(event) => setDetails({ ...details, education: event.target.value })} />
              </Field>
              <Field label="Institution">
                <Input value={details.institution} onChange={(event) => setDetails({ ...details, institution: event.target.value })} />
              </Field>
              <Field label="Graduation year">
                <Input inputMode="numeric" value={details.graduationYear} onChange={(event) => setDetails({ ...details, graduationYear: event.target.value })} />
              </Field>
              <Field label="Professional licence number">
                <Input value={details.licenseNumber} onChange={(event) => setDetails({ ...details, licenseNumber: event.target.value })} />
              </Field>
              <Field label="Languages" className="sm:col-span-2">
                <Input value={details.languages} onChange={(event) => setDetails({ ...details, languages: event.target.value })} />
              </Field>
              <Field label="Professional biography" className="sm:col-span-2">
                <Textarea rows={4} value={details.bio} onChange={(event) => setDetails({ ...details, bio: event.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Button onClick={saveDetails}>
                  <Save className="size-4" />
                  Save profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck2 className="size-4" />
                  Credentials
                </CardTitle>
                <CardDescription>Licence, certificates and supporting documents.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCredentialOpen(true)}>
                <Plus className="size-4" />
                Add credential
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {professional.credentials.length === 0 ? (
                <p className="text-muted-foreground text-sm">No credentials added yet.</p>
              ) : (
                professional.credentials.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.issuer} · Issued {formatDate(item.issuedAt)}
                        {item.expiresAt ? ` · Expires ${formatDate(item.expiresAt)}` : ""}
                      </p>
                    </div>
                    <Badge variant={item.status === "VERIFIED" ? "secondary" : "outline"}>
                      {item.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="size-4" />
                Education and employment history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">{professional.education}</p>
                <p className="text-muted-foreground text-xs">
                  {professional.institution} · {professional.graduationYear}
                </p>
              </div>
              {professional.employmentHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Employment history will appear here as you add roles.
                </p>
              ) : (
                professional.employmentHistory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{entry.role}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.organisation} · {entry.startYear}
                      {entry.endYear ? ` – ${entry.endYear}` : " – Present"}
                    </p>
                    {entry.summary && <p className="text-muted-foreground mt-1 text-xs">{entry.summary}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BriefcaseBusiness className="size-4" />
                Opportunity preferences
              </CardTitle>
              <CardDescription>Used to match new roles and shift alerts to you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Preferred locations">
                <Input value={preferences.locations} onChange={(event) => setPreferences({ ...preferences, locations: event.target.value })} placeholder="Addis Ababa, Adama" />
              </Field>
              <div className="space-y-2">
                <Label>Preferred employment types</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {EMPLOYMENT_TYPES.map((value) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={preferences.employmentTypes.includes(value)}
                        onChange={() => toggleEmploymentType(value)}
                      />
                      {EMPLOYMENT_TYPE_LABELS[value]}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="Expected compensation (ETB)">
                <Input type="number" min={0} value={preferences.expectedSalary} onChange={(event) => setPreferences({ ...preferences, expectedSalary: event.target.value })} />
              </Field>
              <Field label="Availability">
                <Input value={preferences.availability} onChange={(event) => setPreferences({ ...preferences, availability: event.target.value })} placeholder="Available immediately" />
              </Field>
              <Field label="Preferred departments">
                <Input value={preferences.departments} onChange={(event) => setPreferences({ ...preferences, departments: event.target.value })} placeholder="Emergency, Internal Medicine" />
              </Field>
              <Button onClick={savePreferences} className="w-full">
                <Save className="size-4" />
                Save preferences
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeCheck className="size-4" />
                Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <VerificationBadge professional={professional} />
              <p className="text-muted-foreground text-xs">
                Verification covers your licence number and submitted credentials. It does not
                replace a hospital's own pre-employment checks.
              </p>
              <div className="text-muted-foreground grid gap-1 text-xs">
                <span>Licence: {professional.licenseNumber || "Not provided"}</span>
                <span>Member since {formatDate(professional.createdAt.slice(0, 10))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={credentialOpen} onOpenChange={setCredentialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a credential</DialogTitle>
            <DialogDescription>
              Add a licence, certificate or supporting document for review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Document name" className="sm:col-span-2">
              <Input value={credential.name} onChange={(event) => setCredential({ ...credential, name: event.target.value })} placeholder="e.g. Nursing licence" />
            </Field>
            <Field label="Issuing body" className="sm:col-span-2">
              <Input value={credential.issuer} onChange={(event) => setCredential({ ...credential, issuer: event.target.value })} />
            </Field>
            <Field label="Issue date">
              <Input type="date" value={credential.issuedAt} onChange={(event) => setCredential({ ...credential, issuedAt: event.target.value })} />
            </Field>
            <Field label="Expiry date (optional)">
              <Input type="date" value={credential.expiresAt} onChange={(event) => setCredential({ ...credential, expiresAt: event.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCredential}>Add credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
