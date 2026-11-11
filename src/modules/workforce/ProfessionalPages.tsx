import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Sparkles,
  UserRound,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatDate } from "@/utils/format";

import {
  ApplicationStatusPill,
  NotificationList,
  VerificationBadge,
} from "./components";
import {
  applicationsForProfessional,
  employerById,
  fullName,
  markAllNotificationsRead,
  markNotificationRead,
  matchingOpportunities,
  notificationsFor,
  opportunityById,
  profileCompletion,
  unreadNotificationCount,
  useWorkforce,
} from "./store";
import { NOTIFICATION_TYPE_LABELS, type WorkforceNotification } from "./types";

const NOW = Date.now();

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ProfessionalDashboardPage() {
  const { state, professional } = useWorkforce();
  const navigate = useNavigate();
  if (!professional) return null;

  const applications = applicationsForProfessional(professional.id);
  const matching = matchingOpportunities(professional);
  const interviews = state.interviews
    .filter((interview) => {
      const application = state.applications.find((item) => item.id === interview.applicationId);
      return (
        application?.professionalId === professional.id &&
        new Date(interview.scheduledAt).getTime() > NOW &&
        !["DECLINED", "CANCELLED"].includes(interview.status)
      );
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const offers = state.offers.filter((offer) => {
    const application = state.applications.find((item) => item.id === offer.applicationId);
    return application?.professionalId === professional.id && offer.status === "SENT";
  });
  const assignments = state.assignments
    .filter((assignment) => assignment.professionalId === professional.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcomingAssignments = assignments.filter((assignment) => assignment.status === "UPCOMING");
  const notifications = notificationsFor(professional.id).slice(0, 5);
  const completion = profileCompletion(professional);
  const activeApplications = applications.filter(
    (application) => !["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(application.status),
  );

  function handleNotification(notification: WorkforceNotification) {
    markNotificationRead(notification.id);
    if (notification.opportunityId) {
      navigate(`/workforce/opportunities/${notification.opportunityId}`);
    } else if (notification.applicationId) {
      navigate("/workforce/applications");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${fullName(professional)}`}
        description={`${professional.specialty || "Healthcare professional"} · ${
          professional.city
        }, ${professional.region}`}
        actions={
          <div className="flex items-center gap-2">
            <VerificationBadge professional={professional} />
            <Button variant="outline" size="sm" asChild>
              <Link to="/workforce/profile">
                <UserRound className="size-4" />
                Update profile
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available opportunities"
          value={matching.length}
          icon={BriefcaseBusiness}
          hint="Matched to your specialty"
        />
        <StatCard
          label="Applications submitted"
          value={applications.length}
          icon={ClipboardList}
          tone="sky"
          hint={`${activeApplications.length} active`}
        />
        <StatCard
          label="Interviews scheduled"
          value={interviews.length}
          icon={CalendarDays}
          tone="violet"
          hint={interviews[0] ? formatDateTime(interviews[0].scheduledAt) : "No upcoming interview"}
        />
        <StatCard
          label="Offers received"
          value={offers.length}
          icon={FileText}
          tone="amber"
          hint={offers.length > 0 ? "Awaiting your response" : "Offers appear here"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Recommended opportunities</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/workforce/opportunities">
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {matching.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No matched opportunities yet"
                  description="Complete your specialty and preferred locations to receive relevant matches."
                  action={
                    <Button size="sm" asChild>
                      <Link to="/workforce/profile">Complete profile</Link>
                    </Button>
                  }
                />
              ) : (
                matching.slice(0, 3).map((opportunity) => (
                  <div key={opportunity.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/workforce/opportunities/${opportunity.id}`}
                          className="hover:text-primary text-sm font-semibold"
                        >
                          {opportunity.title}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {employerById(opportunity.employerId)?.name} · {opportunity.location}
                        </p>
                      </div>
                      <Badge variant="outline">{opportunity.specialty}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-xs">
                      <span>{opportunity.department}</span>
                      <span>{opportunity.employmentType.replace("_", " ").toLowerCase()}</span>
                      <span>Closes {formatDate(opportunity.applicationDeadline)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Upcoming activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/workforce/applications">Manage applications</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviews.length === 0 && offers.length === 0 && upcomingAssignments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Interviews, offers and confirmed assignments will appear here.
                </p>
              ) : (
                <>
                  {interviews.slice(0, 2).map((interview) => {
                    const application = state.applications.find(
                      (item) => item.id === interview.applicationId,
                    );
                    const opportunity = application ? opportunityById(application.opportunityId) : null;
                    return (
                      <Link
                        key={interview.id}
                        to="/workforce/applications"
                        className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <span className="bg-brand-mint text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <CalendarClock className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">Interview · {opportunity?.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            {formatDateTime(interview.scheduledAt)} · {interview.location}
                          </span>
                        </span>
                        <Badge variant="outline">{interview.status.replace(/_/g, " ")}</Badge>
                      </Link>
                    );
                  })}
                  {offers.map((offer) => {
                    const application = state.applications.find(
                      (item) => item.id === offer.applicationId,
                    );
                    const opportunity = application ? opportunityById(application.opportunityId) : null;
                    return (
                      <Link
                        key={offer.id}
                        to="/workforce/applications"
                        className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <span className="bg-brand-mint text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">Offer · {opportunity?.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            Respond by {formatDate(offer.responseDeadline)}
                          </span>
                        </span>
                        <Badge variant="secondary">Respond</Badge>
                      </Link>
                    );
                  })}
                  {upcomingAssignments.slice(0, 2).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <span className="bg-brand-mint text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-muted-foreground text-xs">
                          Starts {formatDate(assignment.startDate)} · {assignment.compensation}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Profile completion</CardTitle>
              <span className="text-sm font-semibold">{completion.percent}%</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={completion.percent} />
              {completion.missing.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Suggested additions:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    {completion.missing.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-center gap-1.5">
                        <span className="bg-primary/40 size-1.5 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/workforce/profile">Complete your profile</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Your profile includes all the details hospitals look for.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent notifications</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/workforce/notifications">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground px-5 text-sm">No notifications yet.</p>
              ) : (
                <NotificationList notifications={notifications} onOpen={handleNotification} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/workforce/opportunities">
                  <BriefcaseBusiness className="size-4" />
                  Browse opportunities
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/workforce/profile">
                  <UserRound className="size-4" />
                  Update profile & availability
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/workforce/applications">
                  <ClipboardList className="size-4" />
                  View applications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ProfessionalNotificationsPage() {
  const { professional } = useWorkforce();
  const navigate = useNavigate();
  const [category, setCategory] = useState("ALL");
  if (!professional) return null;

  const notifications = notificationsFor(professional.id);
  const unread = unreadNotificationCount(professional.id);
  const filtered =
    category === "ALL"
      ? notifications
      : notifications.filter(
          (notification) => NOTIFICATION_TYPE_LABELS[notification.type] === category,
        );

  function open(notification: WorkforceNotification) {
    markNotificationRead(notification.id);
    if (notification.opportunityId) {
      navigate(`/workforce/opportunities/${notification.opportunityId}`);
    } else if (notification.applicationId) {
      navigate("/workforce/applications");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Opportunity matches, application updates, interview invitations and offers."
        actions={
          <Button
            variant="outline"
            onClick={() => markAllNotificationsRead(professional.id)}
            disabled={unread === 0}
          >
            <Bell className="size-4" />
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52" aria-label="Filter notifications">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All notifications</SelectItem>
            <SelectItem value="New opportunities">New opportunities</SelectItem>
            <SelectItem value="Applications">Applications</SelectItem>
            <SelectItem value="Interviews">Interviews</SelectItem>
            <SelectItem value="Offers">Offers</SelectItem>
            <SelectItem value="Assignments">Assignments</SelectItem>
            <SelectItem value="Credentials">Credentials</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{unread} unread</Badge>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No notifications in this category"
          description="Updates about opportunities, applications and interviews will appear here."
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <NotificationList notifications={filtered} onOpen={open} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ProfessionalApplicationsSummary() {
  const { professional } = useWorkforce();
  if (!professional) return null;
  const applications = applicationsForProfessional(professional.id);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Applications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {applications.slice(0, 4).map((application) => {
          const opportunity = opportunityById(application.opportunityId);
          return (
            <div key={application.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{opportunity?.title}</span>
              <ApplicationStatusPill status={application.status} />
            </div>
          );
        })}
        {applications.length === 0 && (
          <p className="text-muted-foreground text-sm">No applications yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
