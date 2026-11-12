import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/utils/format";

import { ApplicationStatusPill } from "./components";
import {
  applicationsForEmployer,
  createOpportunity,
  fullName,
  interviewsForEmployer,
  moveApplication,
  offersForEmployer,
  opportunitiesForEmployer,
  opportunityById,
  professionalForApplication,
  scheduleInterview,
  sendOffer,
  setOpportunityStatus,
  useWorkforce,
  withdrawOffer,
} from "./store";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  SALARY_PERIODS,
  SALARY_PERIOD_LABELS,
  type ApplicationStatus,
  type NewOpportunityInput,
} from "./types";

const NOW = Date.now();

function useEmployerScope() {
  const { hospitalId, user } = useAuth();
  const { state } = useWorkforce();
  const employer = state.employers.find((item) => item.id === hospitalId);
  return { state, employer, hospitalId, user };
}

function PipelineSummary({ employerId }: { employerId: string }) {
  const applications = applicationsForEmployer(employerId);
  const stages: ApplicationStatus[] = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "OFFER_RECEIVED",
    "ACCEPTED",
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage) => (
        <div key={stage} className="rounded-lg border p-3">
          <p className="text-muted-foreground text-[11px] uppercase">
            {APPLICATION_STATUS_LABELS[stage]}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {applications.filter((application) => application.status === stage).length}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HospitalWorkforceDashboardPage() {
  const { employer, user } = useEmployerScope();
  if (!employer) {
    return (
      <EmptyState
        title="Workforce is not enabled for this hospital"
        description="Workforce recruitment becomes available once your hospital profile is active."
      />
    );
  }

  const opportunities = opportunitiesForEmployer(employer.id);
  const applications = applicationsForEmployer(employer.id);
  const interviews = interviewsForEmployer(employer.id).filter(
    (interview) => interview.status !== "CANCELLED",
  );
  const offers = offersForEmployer(employer.id);
  const active = opportunities.filter((opportunity) => opportunity.status === "PUBLISHED");
  const filled = opportunities.reduce((total, opportunity) => total + opportunity.filled, 0);
  const recent = applications.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce management"
        description={`Recruitment activity for ${employer.name}${user ? ` · ${user.fullName}` : ""}`}
        breadcrumbs={[{ label: "Hospital admin", to: "/hospital-admin" }, { label: "Workforce" }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/hospital/workforce/analytics">View analytics</Link>
            </Button>
            <Button asChild>
              <Link to="/hospital/workforce/opportunities/create">
                <Plus className="size-4" />
                Create opportunity
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active vacancies" value={active.length} icon={BriefcaseBusiness} hint={`${opportunities.length} total listings`} />
        <StatCard label="Total applicants" value={applications.length} icon={UsersRound} tone="sky" />
        <StatCard label="Shortlisted" value={applications.filter((item) => item.status === "SHORTLISTED").length} icon={ClipboardList} tone="violet" />
        <StatCard label="Interviews scheduled" value={interviews.length} icon={CalendarDays} tone="amber" />
        <StatCard label="Offers sent" value={offers.length} icon={Send} tone="sky" />
        <StatCard label="Positions filled" value={filled} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruitment pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineSummary employerId={employer.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent applications</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hospital/workforce/applicants">
              Manage applicants
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Applications will appear here when professionals apply to your published roles.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((application) => {
                  const professional = professionalForApplication(application);
                  const opportunity = opportunityById(application.opportunityId);
                  return (
                    <TableRow key={application.id}>
                      <TableCell className="text-sm font-medium">
                        {professional ? fullName(professional) : "Applicant"}
                      </TableCell>
                      <TableCell className="text-sm">{opportunity?.title}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(application.submittedAt.slice(0, 10))}
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusPill status={application.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recruitment activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center justify-between gap-2">
              <span>New applications this week</span>
              <span className="font-medium">
                {applications.filter((item) => new Date(item.submittedAt).getTime() > NOW - 7 * 86_400_000).length}
              </span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span>Awaiting review</span>
              <span className="font-medium">
                {applications.filter((item) => item.status === "SUBMITTED").length}
              </span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span>Offers awaiting response</span>
              <span className="font-medium">
                {offers.filter((offer) => offer.status === "SENT").length}
              </span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span>Open positions unfilled</span>
              <span className="font-medium">
                {active.reduce((total, item) => total + (item.vacancies - item.filled), 0)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staffing insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active vacancies right now.</p>
            ) : (
              active.slice(0, 5).map((opportunity) => (
                <div key={opportunity.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {opportunity.department} · {opportunity.title}
                  </span>
                  <Badge variant="outline">
                    {opportunity.vacancies - opportunity.filled} open
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function HospitalWorkforceOpportunitiesPage() {
  const { employer } = useEmployerScope();
  if (!employer) {
    return <EmptyState title="Workforce is not enabled for this hospital" />;
  }
  const opportunities = opportunitiesForEmployer(employer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Publish, pause and review every vacancy and temporary shift you have listed."
        breadcrumbs={[{ label: "Workforce", to: "/hospital/workforce" }, { label: "Opportunities" }]}
        actions={
          <Button asChild>
            <Link to="/hospital/workforce/opportunities/create">
              <Plus className="size-4" />
              Create opportunity
            </Link>
          </Button>
        }
      />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No opportunities yet"
          description="Create your first vacancy or temporary shift to start receiving applications."
          action={
            <Button asChild>
              <Link to="/hospital/workforce/opportunities/create">Create opportunity</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{opportunity.title}</p>
                    <Badge variant={opportunity.status === "PUBLISHED" ? "secondary" : "outline"}>
                      {opportunity.status.toLowerCase()}
                    </Badge>
                    {opportunity.isShift && <Badge variant="outline">Shift</Badge>}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {opportunity.department} · {opportunity.location} ·{" "}
                    {EMPLOYMENT_TYPE_LABELS[opportunity.employmentType]}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {opportunity.filled}/{opportunity.vacancies} filled · Posted{" "}
                    {formatDate(opportunity.postedAt.slice(0, 10))} · Closes{" "}
                    {formatDate(opportunity.applicationDeadline)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/workforce/opportunities/${opportunity.id}`}>Preview</Link>
                  </Button>
                  {opportunity.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setOpportunityStatus(opportunity.id, "PUBLISHED");
                        toast.success("Opportunity published and matched professionals notified.");
                      }}
                    >
                      Publish
                    </Button>
                  )}
                  {opportunity.status === "PUBLISHED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpportunityStatus(opportunity.id, "CLOSED");
                        toast.success("Opportunity closed.");
                      }}
                    >
                      Close
                    </Button>
                  )}
                  {opportunity.status === "CLOSED" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setOpportunityStatus(opportunity.id, "PUBLISHED");
                        toast.success("Opportunity reopened.");
                      }}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyOpportunity = {
  title: "",
  department: "",
  category: "GENERAL_PRACTITIONER",
  specialty: "",
  vacancies: "1",
  employmentType: "FULL_TIME",
  isShift: false,
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "MONTH",
  minYears: "2",
  experienceLevel: "MID",
  qualifications: "",
  licenseRequired: "Active professional licence",
  skills: "",
  languages: "English, Amharic",
  location: "",
  startDate: "",
  workingHours: "",
  shiftDate: "",
  startTime: "",
  endTime: "",
  duration: "",
  description: "",
  responsibilities: "",
  benefits: "",
  applicationDeadline: "",
};

export function HospitalWorkforceCreatePage() {
  const { employer } = useEmployerScope();
  const navigate = useNavigate();
  const [values, setValues] = useState(emptyOpportunity);
  const [error, setError] = useState<string | null>(null);

  if (!employer) {
    return <EmptyState title="Workforce is not enabled for this hospital" />;
  }

  const employerId = employer.id;
  const employerCity = employer.city;

  function update<K extends keyof typeof emptyOpportunity>(key: K, value: (typeof emptyOpportunity)[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function submit(publish: boolean) {
    setError(null);
    if (!values.title.trim() || !values.department.trim() || !values.specialty.trim()) {
      setError("Add a job title, department and specialty before saving.");
      return;
    }
    if (!values.description.trim() || !values.applicationDeadline) {
      setError("Add a position description and application deadline.");
      return;
    }
    const input: NewOpportunityInput = {
      title: values.title.trim(),
      department: values.department.trim(),
      category: values.category as NewOpportunityInput["category"],
      specialty: values.specialty.trim(),
      vacancies: Math.max(1, Number(values.vacancies) || 1),
      employmentType: values.employmentType as NewOpportunityInput["employmentType"],
      isShift: values.isShift,
      salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
      salaryPeriod: values.salaryPeriod as NewOpportunityInput["salaryPeriod"],
      minYears: Math.max(0, Number(values.minYears) || 0),
      experienceLevel: values.experienceLevel as NewOpportunityInput["experienceLevel"],
      qualifications: values.qualifications.split("\n").map((item) => item.trim()).filter(Boolean),
      licenseRequired: values.licenseRequired.trim(),
      skills: values.skills.split("\n").map((item) => item.trim()).filter(Boolean),
      languages: values.languages.split(",").map((item) => item.trim()).filter(Boolean),
      location: values.location.trim() || employerCity,
      startDate: values.startDate || values.shiftDate || values.applicationDeadline,
      workingHours: values.workingHours.trim() || "To be agreed",
      shiftDate: values.isShift ? values.shiftDate || undefined : undefined,
      startTime: values.isShift ? values.startTime || undefined : undefined,
      endTime: values.isShift ? values.endTime || undefined : undefined,
      duration: values.duration.trim() || undefined,
      description: values.description.trim(),
      responsibilities: values.responsibilities.split("\n").map((item) => item.trim()).filter(Boolean),
      benefits: values.benefits.split("\n").map((item) => item.trim()).filter(Boolean),
      applicationDeadline: values.applicationDeadline,
    };
    createOpportunity(employerId, input, publish);
    toast.success(publish ? "Opportunity published." : "Draft saved.");
    navigate("/hospital/workforce/opportunities");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create an opportunity"
        description="Publish a vacancy or temporary shift. Matching professionals are notified when it goes live."
        breadcrumbs={[
          { label: "Workforce", to: "/hospital/workforce" },
          { label: "Opportunities", to: "/hospital/workforce/opportunities" },
          { label: "Create" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Position information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" className="sm:col-span-2">
            <Input value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. General Practitioner" />
          </Field>
          <Field label="Department">
            <Input value={values.department} onChange={(event) => update("department", event.target.value)} placeholder="e.g. Internal Medicine" />
          </Field>
          <Field label="Location">
            <Input value={values.location} onChange={(event) => update("location", event.target.value)} placeholder={employer.city} />
          </Field>
          <Field label="Professional category">
            <Select value={values.category} onValueChange={(value) => update("category", value as typeof values.category)}>
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
            <Input value={values.specialty} onChange={(event) => update("specialty", event.target.value)} placeholder="e.g. Cardiology" />
          </Field>
          <Field label="Number of vacancies">
            <Input type="number" min={1} value={values.vacancies} onChange={(event) => update("vacancies", event.target.value)} />
          </Field>
          <Field label="Employment type">
            <Select value={values.employmentType} onValueChange={(value) => update("employmentType", value as typeof values.employmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EMPLOYMENT_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={values.isShift}
              onChange={(event) => update("isShift", event.target.checked)}
            />
            This is a temporary shift rather than a permanent position
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirements</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum experience (years)">
            <Input type="number" min={0} value={values.minYears} onChange={(event) => update("minYears", event.target.value)} />
          </Field>
          <Field label="Experience level">
            <Select value={values.experienceLevel} onValueChange={(value) => update("experienceLevel", value as typeof values.experienceLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EXPERIENCE_LEVEL_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Required qualifications (one per line)" className="sm:col-span-2">
            <Textarea rows={3} value={values.qualifications} onChange={(event) => update("qualifications", event.target.value)} />
          </Field>
          <Field label="Professional licence requirement">
            <Input value={values.licenseRequired} onChange={(event) => update("licenseRequired", event.target.value)} />
          </Field>
          <Field label="Languages (comma separated)">
            <Input value={values.languages} onChange={(event) => update("languages", event.target.value)} />
          </Field>
          <Field label="Additional skills (one per line)" className="sm:col-span-2">
            <Textarea rows={3} value={values.skills} onChange={(event) => update("skills", event.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compensation and working conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Salary from (ETB)">
            <Input type="number" min={0} value={values.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} />
          </Field>
          <Field label="Salary to (ETB)">
            <Input type="number" min={0} value={values.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} />
          </Field>
          <Field label="Payment period">
            <Select value={values.salaryPeriod} onValueChange={(value) => update("salaryPeriod", value as typeof values.salaryPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_PERIODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SALARY_PERIOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Application deadline">
            <Input type="date" value={values.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} />
          </Field>
          <Field label="Start date">
            <Input type="date" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} />
          </Field>
          <Field label="Working hours">
            <Input value={values.workingHours} onChange={(event) => update("workingHours", event.target.value)} placeholder="Monday to Friday, 08:00 – 16:30" />
          </Field>
          <Field label="Contract duration (if applicable)">
            <Input value={values.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 12 months" />
          </Field>
          {values.isShift && (
            <>
              <Field label="Shift date">
                <Input type="date" value={values.shiftDate} onChange={(event) => update("shiftDate", event.target.value)} />
              </Field>
              <Field label="Shift start time">
                <Input type="time" value={values.startTime} onChange={(event) => update("startTime", event.target.value)} />
              </Field>
              <Field label="Shift end time">
                <Input type="time" value={values.endTime} onChange={(event) => update("endTime", event.target.value)} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Position overview">
            <Textarea rows={4} value={values.description} onChange={(event) => update("description", event.target.value)} />
          </Field>
          <Field label="Responsibilities (one per line)">
            <Textarea rows={4} value={values.responsibilities} onChange={(event) => update("responsibilities", event.target.value)} />
          </Field>
          <Field label="Benefits (one per line)">
            <Textarea rows={3} value={values.benefits} onChange={(event) => update("benefits", event.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => submit(false)}>
          Save as draft
        </Button>
        <Button onClick={() => submit(true)}>
          <Send className="size-4" />
          Publish position
        </Button>
      </div>
    </div>
  );
}

export function HospitalWorkforceApplicantsPage() {
  const { employer } = useEmployerScope();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interviewFor, setInterviewFor] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [interviewValues, setInterviewValues] = useState({ scheduledAt: "", location: "", instructions: "" });
  const [offerValues, setOfferValues] = useState({
    salary: "",
    salaryPeriod: "MONTH",
    startDate: "",
    workingHours: "",
    contractDuration: "",
    conditions: "",
    responseDeadline: "",
  });

  if (!employer) return <EmptyState title="Workforce is not enabled for this hospital" />;

  const applications = applicationsForEmployer(employer.id);
  const filtered = applications.filter((application) => {
    if (status !== "ALL" && application.status !== status) return false;
    const professional = professionalForApplication(application);
    const opportunity = opportunityById(application.opportunityId);
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${professional ? fullName(professional) : ""} ${professional?.specialty ?? ""} ${opportunity?.title ?? ""}`
      .toLowerCase()
      .includes(query);
  });
  const selected = filtered.find((application) => application.id === selectedId) ?? null;

  function act(applicationId: string, next: ApplicationStatus, message: string) {
    moveApplication(applicationId, next);
    toast.success(message);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applicants"
        description="Review candidates, move them through the pipeline and make offers."
        breadcrumbs={[{ label: "Workforce", to: "/hospital/workforce" }, { label: "Applicants" }]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/hospital/workforce/opportunities">View opportunities</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, specialty or position"
          aria-label="Search applicants"
          className="sm:max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-56" aria-label="Filter applicants by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {APPLICATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {APPLICATION_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersRound} title="No applicants match these filters" description="Applicants appear here when professionals apply to your roles." />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((application) => {
                  const professional = professionalForApplication(application);
                  const opportunity = opportunityById(application.opportunityId);
                  return (
                    <TableRow key={application.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{professional ? fullName(professional) : "Applicant"}</p>
                        <p className="text-muted-foreground text-xs">
                          {professional?.yearsExperience ?? 0} years ·{" "}
                          {professional?.verificationStatus.toLowerCase()}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{professional?.specialty}</TableCell>
                      <TableCell className="text-sm">{opportunity?.title}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(application.submittedAt.slice(0, 10))}
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusPill status={application.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(application.id)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (() => {
            const professional = professionalForApplication(selected);
            const opportunity = opportunityById(selected.opportunityId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{professional ? fullName(professional) : "Applicant"}</DialogTitle>
                  <DialogDescription>
                    {opportunity?.title} · {professional?.specialty} ·{" "}
                    {professional?.yearsExperience} years
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ApplicationStatusPill status={selected.status} />
                    {professional && (
                      <Badge variant={professional.verificationStatus === "VERIFIED" ? "secondary" : "outline"}>
                        <BadgeCheck className="size-3" />
                        {professional.verificationStatus.toLowerCase()}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Email:</span> {professional?.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {professional?.phone}</p>
                    <p><span className="text-muted-foreground">Licence:</span> {professional?.licenseNumber || "Not provided"}</p>
                    <p><span className="text-muted-foreground">Location:</span> {professional?.city}, {professional?.region}</p>
                    <p className="sm:col-span-2"><span className="text-muted-foreground">Education:</span> {professional?.education} · {professional?.institution} ({professional?.graduationYear})</p>
                  </div>

                  {professional?.bio && (
                    <div>
                      <p className="text-xs font-medium uppercase">Profile summary</p>
                      <p className="text-muted-foreground mt-1 text-sm">{professional.bio}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium uppercase">Cover message</p>
                    <p className="text-muted-foreground mt-1 rounded-lg border bg-muted/30 p-3 text-sm">
                      {selected.coverMessage || "No message provided."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase">Credentials</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {professional?.credentials.length ? (
                        professional.credentials.map((credential) => (
                          <li key={credential.id} className="flex justify-between gap-2">
                            <span>{credential.name}</span>
                            <span className="text-muted-foreground text-xs">{credential.status.toLowerCase()}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">No credentials submitted.</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button size="sm" variant="outline" onClick={() => act(selected.id, "UNDER_REVIEW", "Moved to review.")}>
                      Mark under review
                    </Button>
                    <Button size="sm" onClick={() => act(selected.id, "SHORTLISTED", "Applicant shortlisted.")}>
                      Shortlist
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInterviewFor(selected.id);
                        setInterviewValues({ scheduledAt: "", location: `${employer.name} — ${opportunity?.department ?? ""}`, instructions: "" });
                      }}
                    >
                      <CalendarClock className="size-4" />
                      Schedule interview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOfferFor(selected.id);
                        setOfferValues({
                          salary: "",
                          salaryPeriod: "MONTH",
                          startDate: "",
                          workingHours: opportunity?.workingHours ?? "",
                          contractDuration: opportunity?.duration ?? "Permanent",
                          conditions: "",
                          responseDeadline: "",
                        });
                      }}
                    >
                      <FileText className="size-4" />
                      Send offer
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => act(selected.id, "REJECTED", "Application rejected.")}>
                      Reject
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(interviewFor)} onOpenChange={(open) => !open && setInterviewFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule an interview</DialogTitle>
            <DialogDescription>The applicant receives an invitation immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Date and time">
              <Input
                type="datetime-local"
                value={interviewValues.scheduledAt}
                onChange={(event) => setInterviewValues({ ...interviewValues, scheduledAt: event.target.value })}
              />
            </Field>
            <Field label="Location or meeting details">
              <Input
                value={interviewValues.location}
                onChange={(event) => setInterviewValues({ ...interviewValues, location: event.target.value })}
              />
            </Field>
            <Field label="Instructions">
              <Textarea
                rows={3}
                value={interviewValues.instructions}
                onChange={(event) => setInterviewValues({ ...interviewValues, instructions: event.target.value })}
                placeholder="What should the candidate bring or prepare?"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewFor(null)}>Cancel</Button>
            <Button
              disabled={!interviewValues.scheduledAt || !interviewValues.location.trim()}
              onClick={() => {
                if (!interviewFor) return;
                try {
                  scheduleInterview(interviewFor, {
                    scheduledAt: new Date(interviewValues.scheduledAt).toISOString(),
                    location: interviewValues.location,
                    instructions: interviewValues.instructions,
                  });
                  toast.success("Interview invitation sent.");
                  setInterviewFor(null);
                  setSelectedId(null);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to schedule interview.");
                }
              }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(offerFor)} onOpenChange={(open) => !open && setOfferFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send a job offer</DialogTitle>
            <DialogDescription>The applicant can accept or decline the offer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Salary (ETB)">
              <Input type="number" value={offerValues.salary} onChange={(event) => setOfferValues({ ...offerValues, salary: event.target.value })} />
            </Field>
            <Field label="Payment period">
              <Select value={offerValues.salaryPeriod} onValueChange={(value) => setOfferValues({ ...offerValues, salaryPeriod: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_PERIODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SALARY_PERIOD_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start date">
              <Input type="date" value={offerValues.startDate} onChange={(event) => setOfferValues({ ...offerValues, startDate: event.target.value })} />
            </Field>
            <Field label="Response deadline">
              <Input type="date" value={offerValues.responseDeadline} onChange={(event) => setOfferValues({ ...offerValues, responseDeadline: event.target.value })} />
            </Field>
            <Field label="Working hours" className="sm:col-span-2">
              <Input value={offerValues.workingHours} onChange={(event) => setOfferValues({ ...offerValues, workingHours: event.target.value })} />
            </Field>
            <Field label="Contract duration" className="sm:col-span-2">
              <Input value={offerValues.contractDuration} onChange={(event) => setOfferValues({ ...offerValues, contractDuration: event.target.value })} />
            </Field>
            <Field label="Additional conditions" className="sm:col-span-2">
              <Textarea rows={3} value={offerValues.conditions} onChange={(event) => setOfferValues({ ...offerValues, conditions: event.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferFor(null)}>Cancel</Button>
            <Button
              disabled={!offerValues.salary || !offerValues.startDate || !offerValues.responseDeadline}
              onClick={() => {
                if (!offerFor) return;
                try {
                  sendOffer(offerFor, {
                    salary: Number(offerValues.salary),
                    salaryPeriod: offerValues.salaryPeriod as "MONTH" | "DAY" | "SHIFT" | "HOUR",
                    startDate: offerValues.startDate,
                    workingHours: offerValues.workingHours,
                    contractDuration: offerValues.contractDuration,
                    conditions: offerValues.conditions,
                    responseDeadline: offerValues.responseDeadline,
                  });
                  toast.success("Offer sent.");
                  setOfferFor(null);
                  setSelectedId(null);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to send offer.");
                }
              }}
            >
              Send offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HospitalWorkforceInterviewsPage() {
  const { employer } = useEmployerScope();
  if (!employer) return <EmptyState title="Workforce is not enabled for this hospital" />;
  const interviews = interviewsForEmployer(employer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Manage scheduled interviews and invitations."
        breadcrumbs={[{ label: "Workforce", to: "/hospital/workforce" }, { label: "Interviews" }]}
      />
      {interviews.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No interviews scheduled" description="Shortlist an applicant to arrange an interview." />
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => {
            const application = applicationsForEmployer(employer.id).find(
              (item) => item.id === interview.applicationId,
            );
            const professional = application ? professionalForApplication(application) : undefined;
            const opportunity = application ? opportunityById(application.opportunityId) : undefined;
            return (
              <Card key={interview.id}>
                <CardContent className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {professional ? fullName(professional) : "Applicant"} · {opportunity?.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(interview.scheduledAt)} · {interview.location}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {interview.instructions}
                    </p>
                  </div>
                  <Badge variant={interview.status === "CONFIRMED" ? "secondary" : "outline"}>
                    {interview.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HospitalWorkforceOffersPage() {
  const { employer } = useEmployerScope();
  if (!employer) return <EmptyState title="Workforce is not enabled for this hospital" />;
  const offers = offersForEmployer(employer.id);
  const applications = applicationsForEmployer(employer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="Track offers sent to shortlisted professionals."
        breadcrumbs={[{ label: "Workforce", to: "/hospital/workforce" }, { label: "Offers" }]}
      />
      {offers.length === 0 ? (
        <EmptyState icon={FileText} title="No offers sent" description="Offers you send to shortlisted applicants appear here." />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const application = applications.find((item) => item.id === offer.applicationId);
            const professional = application ? professionalForApplication(application) : undefined;
            const opportunity = application ? opportunityById(application.opportunityId) : undefined;
            return (
              <Card key={offer.id}>
                <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {professional ? fullName(professional) : "Applicant"} · {opportunity?.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {offer.salary.toLocaleString()} ETB {SALARY_PERIOD_LABELS[offer.salaryPeriod]} · starts{" "}
                      {formatDate(offer.startDate)} · respond by {formatDate(offer.responseDeadline)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={offer.status === "SENT" ? "default" : "secondary"}>
                      {offer.status.toLowerCase()}
                    </Badge>
                    {offer.status === "SENT" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          withdrawOffer(offer.id);
                          toast.success("Offer withdrawn.");
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HospitalWorkforceAnalyticsPage() {
  const { employer } = useEmployerScope();
  if (!employer) return <EmptyState title="Workforce is not enabled for this hospital" />;

  const opportunities = opportunitiesForEmployer(employer.id);
  const applications = applicationsForEmployer(employer.id);
  const offers = offersForEmployer(employer.id);
  const accepted = applications.filter((item) => item.status === "ACCEPTED").length;
  const filled = opportunities.reduce((total, opportunity) => total + opportunity.filled, 0);
  const active = opportunities.filter((item) => item.status === "PUBLISHED");
  const conversion = applications.length
    ? Math.round((accepted / applications.length) * 100)
    : 0;

  const departmentMap = new Map<string, number>();
  active.forEach((opportunity) => {
    departmentMap.set(
      opportunity.department,
      (departmentMap.get(opportunity.department) ?? 0) + opportunity.vacancies - opportunity.filled,
    );
  });
  const departments = [...departmentMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxDepartment = Math.max(1, ...departments.map(([, value]) => value));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce analytics"
        description="Recruitment activity calculated from your current listings and applications."
        breadcrumbs={[{ label: "Workforce", to: "/hospital/workforce" }, { label: "Analytics" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active vacancies" value={active.length} icon={BriefcaseBusiness} hint={`${active.reduce((total, item) => total + item.vacancies - item.filled, 0)} unfilled positions`} />
        <StatCard label="Filled positions" value={filled} icon={CheckCircle2} tone="sky" />
        <StatCard label="Total applicants" value={applications.length} icon={UsersRound} tone="violet" />
        <StatCard label="Offers sent" value={offers.length} icon={Send} tone="amber" />
        <StatCard label="Accepted offers" value={accepted} icon={UserRound} />
        <StatCard label="Application conversion" value={`${conversion}%`} icon={ClipboardList} tone="sky" hint="Accepted offers / applications" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open positions by department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {departments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active vacancies to display.</p>
          ) : (
            departments.map(([department, value]) => (
              <div key={department} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{department}</span>
                  <span className="text-muted-foreground">{value} open</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(value / maxDepartment) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline distribution</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPLICATION_STATUSES.map((status) => (
            <div key={status} className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{APPLICATION_STATUS_LABELS[status]}</p>
              <p className="mt-1 text-xl font-semibold">
                {applications.filter((application) => application.status === status).length}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Metrics reflect the listings and applications currently recorded for {employer.name}.
      </p>
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
