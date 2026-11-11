import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  Search,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/utils/format";

import { ApplicationStatusPill } from "./components";
import {
  applicationsForProfessional,
  employerById,
  interviewForApplication,
  nextActionFor,
  offerForApplication,
  opportunityById,
  respondToInterview,
  respondToOffer,
  useWorkforce,
  withdrawApplication,
} from "./store";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  SALARY_PERIOD_LABELS,
  type Application,
  type Interview,
  type Offer,
} from "./types";

const NOW = Date.now();

export function ProfessionalApplicationsPage() {
  const { state, professional } = useWorkforce();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState<"updated" | "submitted">("updated");
  const [selected, setSelected] = useState<Application | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<Application | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Interview | null>(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [offerTarget, setOfferTarget] = useState<{ offer: Offer; accept: boolean } | null>(null);

  if (!professional) return null;

  const allApplications = applicationsForProfessional(professional.id);
  const applicationIds = new Set(allApplications.map((application) => application.id));
  const interviews = state.interviews
    .filter((interview) => applicationIds.has(interview.applicationId))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const offers = state.offers
    .filter((offer) => applicationIds.has(offer.applicationId))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const assignments = state.assignments
    .filter((assignment) => assignment.professionalId === professional.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const query = search.trim().toLowerCase();
  const filtered = allApplications
    .filter((application) => {
      if (status !== "ALL" && application.status !== status) return false;
      if (!query) return true;
      const opportunity = opportunityById(application.opportunityId);
      const employer = opportunity ? employerById(opportunity.employerId) : undefined;
      return `${opportunity?.title ?? ""} ${employer?.name ?? ""}`
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) =>
      sort === "submitted"
        ? b.submittedAt.localeCompare(a.submittedAt)
        : b.updatedAt.localeCompare(a.updatedAt),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Track every application, interview invitation, offer and confirmed assignment."
        actions={
          <Button variant="outline" asChild>
            <Link to="/workforce/opportunities">Find opportunities</Link>
          </Button>
        }
      />

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger value="applications">
            Applications
            <Badge variant="secondary" className="ml-1">
              {allApplications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="interviews">
            Interviews
            <Badge variant="secondary" className="ml-1">
              {interviews.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="offers">
            Offers
            <Badge variant="secondary" className="ml-1">
              {offers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments
            <Badge variant="secondary" className="ml-1">
              {assignments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by position or hospital"
                className="pl-9"
                aria-label="Search applications"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-52" aria-label="Filter by status">
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
            <Select value={sort} onValueChange={(value) => setSort(value as "updated" | "submitted")}>
              <SelectTrigger className="sm:w-48" aria-label="Sort applications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last updated</SelectItem>
                <SelectItem value="submitted">Date applied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No applications match these filters"
              description="When you apply for an opportunity it will appear here with its current status."
              action={
                <Button asChild>
                  <Link to="/workforce/opportunities">Browse opportunities</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((application) => {
                const opportunity = opportunityById(application.opportunityId);
                const employer = opportunity ? employerById(opportunity.employerId) : undefined;
                return (
                  <Card key={application.id}>
                    <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{opportunity?.title ?? "Opportunity"}</p>
                          <ApplicationStatusPill status={application.status} />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {employer?.name} · {opportunity?.location}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Applied {formatDate(application.submittedAt.slice(0, 10))} · Updated{" "}
                          {formatDate(application.updatedAt.slice(0, 10))}
                        </p>
                        <p className="text-xs">{nextActionFor(application)}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(application)}>
                          View details
                        </Button>
                        {["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(application.status) && (
                          <Button variant="ghost" size="sm" onClick={() => setWithdrawTarget(application)}>
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
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          {interviews.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No interviews scheduled"
              description="Interview invitations from hospitals will appear here."
            />
          ) : (
            interviews.map((interview) => {
              const application = allApplications.find((item) => item.id === interview.applicationId);
              const opportunity = application ? opportunityById(application.opportunityId) : undefined;
              const employer = opportunity ? employerById(opportunity.employerId) : undefined;
              const past = new Date(interview.scheduledAt).getTime() < NOW;
              return (
                <Card key={interview.id}>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {opportunity?.title ?? "Interview"} · {employer?.name}
                        </p>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                          <Clock className="size-3.5" />
                          {formatDateTime(interview.scheduledAt)}
                        </p>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                          <MapPin className="size-3.5" />
                          {interview.location}
                        </p>
                      </div>
                      <Badge variant={interview.status === "CONFIRMED" ? "secondary" : "outline"}>
                        {interview.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground rounded-lg border bg-muted/30 p-3 text-sm">
                      {interview.instructions}
                    </p>
                    {interview.professionalNote && (
                      <p className="text-xs">
                        <span className="font-medium">Your note: </span>
                        {interview.professionalNote}
                      </p>
                    )}
                    {interview.status === "INVITED" && !past && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            respondToInterview(interview.id, "CONFIRMED");
                            toast.success("Interview confirmed.");
                          }}
                        >
                          <CheckCircle2 className="size-4" />
                          Confirm attendance
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRescheduleTarget(interview);
                            setRescheduleNote("");
                          }}
                        >
                          Request different time
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            respondToInterview(interview.id, "DECLINED");
                            toast.success("Interview invitation declined.");
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    {interview.status === "RESCHEDULE_REQUESTED" && (
                      <p className="text-muted-foreground text-xs">
                        Your request has been sent. The hospital will update the invitation.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          {offers.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No offers yet"
              description="Offers from hospitals appear here once you have been shortlisted."
            />
          ) : (
            offers.map((offer) => {
              const application = allApplications.find((item) => item.id === offer.applicationId);
              const opportunity = application ? opportunityById(application.opportunityId) : undefined;
              const employer = opportunity ? employerById(opportunity.employerId) : undefined;
              return (
                <Card key={offer.id}>
                  <CardHeader className="flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{opportunity?.title ?? "Offer"}</CardTitle>
                      <p className="text-muted-foreground text-xs">{employer?.name}</p>
                    </div>
                    <Badge variant={offer.status === "SENT" ? "default" : "secondary"}>
                      {offer.status.toLowerCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">Salary</p>
                        <p>
                          {offer.salary.toLocaleString()} ETB{" "}
                          {SALARY_PERIOD_LABELS[offer.salaryPeriod]}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">Start date</p>
                        <p>{formatDate(offer.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">Working hours</p>
                        <p>{offer.workingHours}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">Contract</p>
                        <p>{offer.contractDuration}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">Respond by</p>
                        <p>{formatDate(offer.responseDeadline)}</p>
                      </div>
                    </div>
                    {offer.conditions && (
                      <p className="text-muted-foreground rounded-lg border bg-muted/30 p-3 text-sm">
                        {offer.conditions}
                      </p>
                    )}
                    {offer.status === "SENT" && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setOfferTarget({ offer, accept: true })}>
                          Accept offer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOfferTarget({ offer, accept: false })}
                        >
                          Decline offer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No assignments yet"
              description="Once you accept an offer, your confirmed assignment appears here."
            />
          ) : (
            assignments.map((assignment) => {
              const employer = employerById(assignment.employerId);
              return (
                <Card key={assignment.id}>
                  <CardContent className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{assignment.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {employer?.name} · Starts {formatDate(assignment.startDate)}
                        {assignment.endDate ? ` · Ends ${formatDate(assignment.endDate)}` : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">{assignment.compensation}</p>
                    </div>
                    <Badge variant={assignment.status === "UPCOMING" ? "secondary" : "outline"}>
                      {assignment.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{opportunityById(selected.opportunityId)?.title}</DialogTitle>
                <DialogDescription>
                  {employerById(opportunityById(selected.opportunityId)?.employerId ?? "")?.name} ·{" "}
                  {opportunityById(selected.opportunityId)?.location}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusPill status={selected.status} />
                  <span className="text-muted-foreground text-xs">{nextActionFor(selected)}</span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase">Your message</p>
                  <p className="text-muted-foreground mt-1 rounded-lg border bg-muted/30 p-3 text-sm">
                    {selected.coverMessage || "No message provided."}
                  </p>
                </div>
                {interviewForApplication(selected.id) && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase">Interview</p>
                    <p className="mt-1 text-sm">
                      {formatDateTime(interviewForApplication(selected.id)!.scheduledAt)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {interviewForApplication(selected.id)!.location}
                    </p>
                  </div>
                )}
                {offerForApplication(selected.id) && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase">Offer</p>
                    <p className="mt-1 text-sm">
                      {offerForApplication(selected.id)!.salary.toLocaleString()} ETB · starts{" "}
                      {formatDate(offerForApplication(selected.id)!.startDate)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase">Activity</p>
                  <ol className="mt-2 space-y-2">
                    {selected.timeline.map((event, index) => (
                      <li key={`${event.label}-${index}`} className="flex gap-2 text-sm">
                        <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                        <div>
                          <p>{event.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateTime(event.at)}
                            {event.note ? ` · ${event.note}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(withdrawTarget)} onOpenChange={(open) => !open && setWithdrawTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw this application?</DialogTitle>
            <DialogDescription>
              The hospital will see that you withdrew. You cannot undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawTarget(null)}>
              Keep application
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!withdrawTarget) return;
                try {
                  withdrawApplication(withdrawTarget.id);
                  toast.success("Application withdrawn.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to withdraw.");
                }
                setWithdrawTarget(null);
              }}
            >
              Withdraw application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a different interview time</DialogTitle>
            <DialogDescription>
              Add the times or dates that work for you. The hospital will update the invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-note">Preferred times</Label>
            <Textarea
              id="reschedule-note"
              rows={3}
              value={rescheduleNote}
              onChange={(event) => setRescheduleNote(event.target.value)}
              placeholder="e.g. Weekday mornings before 11:00 would work better."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={rescheduleNote.trim().length < 4}
              onClick={() => {
                if (!rescheduleTarget) return;
                respondToInterview(rescheduleTarget.id, "RESCHEDULE_REQUESTED", rescheduleNote);
                setRescheduleTarget(null);
                toast.success("Reschedule request sent.");
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(offerTarget)} onOpenChange={(open) => !open && setOfferTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{offerTarget?.accept ? "Accept this offer?" : "Decline this offer?"}</DialogTitle>
            <DialogDescription>
              {offerTarget?.accept
                ? "This confirms your assignment and notifies the hospital."
                : "The hospital will be informed that you declined the offer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={offerTarget?.accept ? "default" : "destructive"}
              onClick={() => {
                if (!offerTarget) return;
                respondToOffer(offerTarget.offer.id, offerTarget.accept);
                setOfferTarget(null);
                toast.success(offerTarget.accept ? "Offer accepted." : "Offer declined.");
              }}
            >
              {offerTarget?.accept ? "Accept offer" : "Decline offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
