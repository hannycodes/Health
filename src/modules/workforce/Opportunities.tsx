import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Search,
  Share2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/utils/format";

import {
  ApplicationStatusPill,
  OpportunityCard,
  WorkforceEmptyState,
} from "./components";
import {
  applyToOpportunity,
  applicationsForProfessional,
  employerById,
  fullName,
  opportunityById,
  salaryLabel,
  toggleSavedOpportunity,
  useWorkforce,
} from "./store";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  SALARY_PERIOD_LABELS,
} from "./types";

type SortKey = "recent" | "deadline" | "salary";

const NOW = Date.now();

export function OpportunitiesPage() {
  const { state, professional } = useWorkforce();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [employmentType, setEmploymentType] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [experience, setExperience] = useState("ALL");
  const [minimumSalary, setMinimumSalary] = useState("");
  const [postedWithin, setPostedWithin] = useState("ANY");
  const [sort, setSort] = useState<SortKey>("recent");
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const locations = useMemo(
    () => Array.from(new Set(state.opportunities.map((item) => item.location))).sort(),
    [state.opportunities],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = postedWithin === "ANY" ? 0 : Number(postedWithin) * 86_400_000;
    const items = state.opportunities.filter((opportunity) => {
      if (opportunity.status !== "PUBLISHED") return false;
      if (savedOnly && !professional?.savedOpportunityIds.includes(opportunity.id)) return false;
      if (category !== "ALL" && opportunity.category !== category) return false;
      if (employmentType !== "ALL" && opportunity.employmentType !== employmentType) return false;
      if (location !== "ALL" && opportunity.location !== location) return false;
      if (experience !== "ALL" && opportunity.experienceLevel !== experience) return false;
      if (minimumSalary && (opportunity.salaryMin ?? 0) < Number(minimumSalary)) return false;
      if (cutoff && new Date(opportunity.postedAt).getTime() < NOW - cutoff) return false;
      if (query) {
        const employer = employerById(opportunity.employerId);
        const haystack =
          `${opportunity.title} ${opportunity.specialty} ${opportunity.department} ${opportunity.location} ${employer?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return items.sort((a, b) => {
      if (sort === "deadline") return a.applicationDeadline.localeCompare(b.applicationDeadline);
      if (sort === "salary") return (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0);
      return b.postedAt.localeCompare(a.postedAt);
    });
  }, [
    state.opportunities,
    search,
    category,
    employmentType,
    location,
    experience,
    minimumSalary,
    postedWithin,
    sort,
    savedOnly,
    professional,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setSearch("");
    setCategory("ALL");
    setEmploymentType("ALL");
    setLocation("ALL");
    setExperience("ALL");
    setMinimumSalary("");
    setPostedWithin("ANY");
    setSavedOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Open opportunities"
        description="Permanent roles, contracts, freelance work and temporary shifts across MyHealth hospitals."
        actions={
          <Button
            variant={savedOnly ? "default" : "outline"}
            onClick={() => {
              setSavedOnly((value) => !value);
              setPage(1);
            }}
          >
            Saved opportunities
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by job title, specialty, hospital, department or location"
              className="pl-9"
              aria-label="Search opportunities"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={category} onValueChange={(value) => { setCategory(value); setPage(1); }}>
              <SelectTrigger aria-label="Professional category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {PROFESSIONAL_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PROFESSIONAL_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employmentType} onValueChange={(value) => { setEmploymentType(value); setPage(1); }}>
              <SelectTrigger aria-label="Employment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employment types</SelectItem>
                {EMPLOYMENT_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EMPLOYMENT_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={(value) => { setLocation(value); setPage(1); }}>
              <SelectTrigger aria-label="Location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All locations</SelectItem>
                {locations.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={experience} onValueChange={(value) => { setExperience(value); setPage(1); }}>
              <SelectTrigger aria-label="Experience level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All experience levels</SelectItem>
                {EXPERIENCE_LEVELS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EXPERIENCE_LEVEL_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={minimumSalary}
              onChange={(event) => { setMinimumSalary(event.target.value); setPage(1); }}
              placeholder="Minimum salary (ETB)"
              aria-label="Minimum salary"
            />
            <Select value={postedWithin} onValueChange={(value) => { setPostedWithin(value); setPage(1); }}>
              <SelectTrigger aria-label="Posting date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any posting date</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger aria-label="Sort opportunities">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="deadline">Deadline: soonest</SelectItem>
                <SelectItem value="salary">Salary: highest first</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} match your
            search.
          </p>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No opportunities match these filters"
          description="Try widening your search or clearing a filter to see more roles."
          action={<Button onClick={resetFilters}>Clear filters</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              professional={professional}
            />
          ))}
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { professional } = useWorkforce();
  const navigate = useNavigate();
  const opportunity = id ? opportunityById(id) : undefined;
  const employer = opportunity ? employerById(opportunity.employerId) : undefined;
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState("");

  if (!professional) return null;

  if (!opportunity || !employer) {
    return (
      <WorkforceEmptyState
        title="Opportunity not found"
        description="This role may have been removed or the link is no longer valid."
        action={
          <Button asChild>
            <Link to="/workforce/opportunities">Browse opportunities</Link>
          </Button>
        }
      />
    );
  }

  const application = stateApplicationFor(professional.id, opportunity.id);
  const saved = professional.savedOpportunityIds.includes(opportunity.id);
  const closed =
    opportunity.status !== "PUBLISHED" ||
    opportunity.filled >= opportunity.vacancies ||
    opportunity.applicationDeadline < new Date().toISOString().slice(0, 10);

  function submitApplication() {
    try {
      applyToOpportunity(professional!.id, opportunity!.id, coverMessage);
      setApplyOpen(false);
      setCoverMessage("");
      toast.success("Application submitted. You can track it under Applications.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit your application.");
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Opportunity link copied.");
    } catch {
      toast.error("Copy the address from your browser to share this opportunity.");
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/workforce/opportunities"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        All opportunities
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">{opportunity.title}</h1>
                  <p className="text-muted-foreground text-sm">
                    {employer.name} · {opportunity.department}
                  </p>
                </div>
                <Badge variant={opportunity.isShift ? "secondary" : "outline"}>
                  {opportunity.isShift ? "Temporary shift" : EMPLOYMENT_TYPE_LABELS[opportunity.employmentType]}
                </Badge>
              </div>

              <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" />
                  {opportunity.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Wallet className="size-4" />
                  {salaryLabel(opportunity)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <BriefcaseBusiness className="size-4" />
                  {opportunity.specialty} · {opportunity.minYears}+ years
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="size-4" />
                  Apply by {formatDate(opportunity.applicationDeadline)}
                </span>
              </div>

              <p className="text-sm leading-relaxed">{opportunity.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {opportunity.responsibilities.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Qualifications</p>
                <ul className="mt-2 space-y-1">
                  {opportunity.qualifications.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Experience</p>
                <p className="mt-1">
                  {opportunity.minYears}+ years · {EXPERIENCE_LEVEL_LABELS[opportunity.experienceLevel]}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Licence</p>
                <p className="mt-1">{opportunity.licenseRequired}</p>
              </div>
              {opportunity.skills.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Additional skills</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opportunity.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Languages</p>
                <p className="mt-1">{opportunity.languages.join(", ")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Working conditions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Start date</p>
                <p>{formatDate(opportunity.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Working hours</p>
                <p>{opportunity.workingHours}</p>
              </div>
              {opportunity.isShift && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">Shift date</p>
                    <p>{opportunity.shiftDate ? formatDate(opportunity.shiftDate) : "Flexible"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">Shift hours</p>
                    <p>
                      {opportunity.startTime} – {opportunity.endTime}
                    </p>
                  </div>
                </>
              )}
              {opportunity.duration && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Duration</p>
                  <p>{opportunity.duration}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs uppercase">Positions available</p>
                <p>
                  {opportunity.vacancies - opportunity.filled} of {opportunity.vacancies}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Compensation</p>
                <p>
                  {salaryLabel(opportunity)}{" "}
                  {opportunity.salaryPeriod !== "MONTH" && (
                    <span className="text-muted-foreground">
                      {SALARY_PERIOD_LABELS[opportunity.salaryPeriod]}
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {opportunity.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the hospital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-brand-mint text-primary flex size-10 items-center justify-center rounded-lg text-sm font-semibold">
                  {employer.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{employer.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <MapPin className="size-3" />
                    {employer.city}, {employer.region}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{employer.about}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <BadgeCheck className="size-4" />
                Verified hospital account
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              {application ? (
                <>
                  <p className="text-sm font-medium">Your application</p>
                  <ApplicationStatusPill status={application.status} />
                  <p className="text-muted-foreground text-xs">
                    Submitted {formatDate(application.submittedAt.slice(0, 10))}
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/workforce/applications")}>
                    Track application
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full"
                  disabled={closed}
                  onClick={() => setApplyOpen(true)}
                >
                  {closed ? "Applications closed" : "Apply Now"}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toggleSavedOpportunity(professional.id, opportunity.id)}
              >
                {saved ? "Saved" : "Save Opportunity"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => void share()}>
                <Share2 className="size-4" />
                Share Opportunity
              </Button>
              <p className="text-muted-foreground text-center text-xs">
                {opportunity.vacancies} {opportunity.vacancies === 1 ? "position" : "positions"} ·{" "}
                {opportunity.filled} filled
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for {opportunity.title}</DialogTitle>
            <DialogDescription>
              Review your profile details below, then add a short message for the hospital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              <p className="font-medium">{fullName(professional)}</p>
              <p className="text-muted-foreground text-xs">
                {professional.specialty} · {professional.yearsExperience} years ·{" "}
                {professional.licenseNumber || "Licence not provided"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {professional.email} · {professional.phone}
              </p>
              <Link
                to="/workforce/profile"
                className="text-primary mt-2 inline-block text-xs font-medium hover:underline"
              >
                Update profile before applying
              </Link>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover-message">Message to the hospital</Label>
              <Textarea
                id="cover-message"
                rows={4}
                value={coverMessage}
                onChange={(event) => setCoverMessage(event.target.value)}
                placeholder="Highlight the experience and qualifications most relevant to this role."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitApplication}>Submit application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function stateApplicationFor(professionalId: string, opportunityId: string) {
  return applicationsForProfessional(professionalId).find(
    (application) => application.opportunityId === opportunityId,
  );
}
