import { useSyncExternalStore } from "react";

import { createWorkforceSeed } from "./data";
import type {
  Application,
  ApplicationStatus,
  Assignment,
  Employer,
  Interview,
  InterviewStatus,
  NewOpportunityInput,
  Offer,
  Opportunity,
  OpportunityStatus,
  Professional,
  ProfessionalRegistrationInput,
  SalaryPeriod,
  WorkforceNotification,
  WorkforceNotificationType,
  WorkforceState,
  VerificationStatus,
  WorkforceAccountStatus,
} from "./types";
import { NOTIFICATION_TYPE_LABELS, SALARY_PERIOD_LABELS } from "./types";

const STORAGE_KEY = "myhealth:workforce:v1";

const listeners = new Set<() => void>();

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function nowISO() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normaliseState(value: unknown): WorkforceState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WorkforceState>;
  const collections = [
    "professionals",
    "accounts",
    "employers",
    "opportunities",
    "applications",
    "interviews",
    "offers",
    "notifications",
    "assignments",
  ] as const;
  if (collections.some((key) => !Array.isArray(candidate[key]))) return null;
  return {
    ...(candidate as WorkforceState),
    sessionProfessionalId: candidate.sessionProfessionalId ?? null,
  };
}

function loadState(): WorkforceState {
  if (typeof window === "undefined") return createWorkforceSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createWorkforceSeed();
    return normaliseState(JSON.parse(raw)) ?? createWorkforceSeed();
  } catch {
    return createWorkforceSeed();
  }
}

let state: WorkforceState = loadState();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private mode; state still works in memory.
  }
}

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

function setState(next: WorkforceState) {
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkforceState() {
  return state;
}

export function useWorkforceState(): WorkforceState {
  return useSyncExternalStore(subscribe, getWorkforceState, getWorkforceState);
}

export function useWorkforce() {
  const snapshot = useWorkforceState();
  const professional =
    snapshot.professionals.find((person) => person.id === snapshot.sessionProfessionalId) ?? null;
  return { state: snapshot, professional };
}

/* -------------------------------------------------------------------------- */
/*                                 Selectors                                  */
/* -------------------------------------------------------------------------- */

export function fullName(person: Professional, withTitle = true) {
  const name = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
  return withTitle && person.title ? `${person.title} ${name}` : name;
}

export function initialsOf(person: Professional) {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

export function employerById(employerId: string): Employer | undefined {
  return state.employers.find((employer) => employer.id === employerId);
}

export function opportunityById(id: string): Opportunity | undefined {
  return state.opportunities.find((opportunity) => opportunity.id === id);
}

export function professionalById(id: string): Professional | undefined {
  return state.professionals.find((person) => person.id === id);
}

export function applicationById(id: string): Application | undefined {
  return state.applications.find((application) => application.id === id);
}

export function interviewById(id: string): Interview | undefined {
  return state.interviews.find((interview) => interview.id === id);
}

export function offerById(id: string): Offer | undefined {
  return state.offers.find((offer) => offer.id === id);
}

export function salaryLabel(opportunity: Opportunity) {
  const period = SALARY_PERIOD_LABELS[opportunity.salaryPeriod];
  if (opportunity.salaryMin && opportunity.salaryMax) {
    if (opportunity.salaryMin === opportunity.salaryMax) {
      return `${opportunity.salaryMin.toLocaleString()} ETB ${period}`;
    }
    return `${opportunity.salaryMin.toLocaleString()} – ${opportunity.salaryMax.toLocaleString()} ETB ${period}`;
  }
  if (opportunity.salaryMin) return `From ${opportunity.salaryMin.toLocaleString()} ETB ${period}`;
  return "Compensation discussed on offer";
}

export function notificationsFor(professionalId: string) {
  return state.notifications
    .filter((notification) => notification.professionalId === professionalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(professionalId: string) {
  return state.notifications.filter(
    (notification) => notification.professionalId === professionalId && !notification.isRead,
  ).length;
}

export function applicationsForProfessional(professionalId: string) {
  return state.applications
    .filter((application) => application.professionalId === professionalId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function opportunitiesForEmployer(employerId: string) {
  return state.opportunities
    .filter((opportunity) => opportunity.employerId === employerId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export function applicationsForEmployer(employerId: string) {
  const opportunityIds = new Set(opportunitiesForEmployer(employerId).map((item) => item.id));
  return state.applications
    .filter((application) => opportunityIds.has(application.opportunityId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function interviewsForEmployer(employerId: string) {
  const applicationIds = new Set(applicationsForEmployer(employerId).map((item) => item.id));
  return state.interviews
    .filter((interview) => applicationIds.has(interview.applicationId))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function offersForEmployer(employerId: string) {
  const applicationIds = new Set(applicationsForEmployer(employerId).map((item) => item.id));
  return state.offers
    .filter((offer) => applicationIds.has(offer.applicationId))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function opportunityForApplication(application: Application) {
  return opportunityById(application.opportunityId);
}

export function professionalForApplication(application: Application) {
  return professionalById(application.professionalId);
}

export function interviewForApplication(applicationId: string) {
  return state.interviews.find((interview) => interview.applicationId === applicationId);
}

export function offerForApplication(applicationId: string) {
  return state.offers.find((offer) => offer.applicationId === applicationId);
}

export function nextActionFor(application: Application) {
  switch (application.status) {
    case "SUBMITTED":
      return "Awaiting review by the hospital";
    case "UNDER_REVIEW":
      return "The recruitment team is reviewing your profile";
    case "SHORTLISTED":
      return "Shortlisted — interview details will follow";
    case "INTERVIEW_SCHEDULED":
      return "Confirm or manage your interview";
    case "OFFER_RECEIVED":
      return "Review and respond to your offer";
    case "ACCEPTED":
      return "Offer accepted — assignment confirmed";
    case "REJECTED":
      return "This application was not progressed";
    case "WITHDRAWN":
      return "You withdrew this application";
  }
}

export function profileCompletion(professional: Professional) {
  const checks: { label: string; done: boolean }[] = [
    { label: "Contact details", done: Boolean(professional.phone && professional.city) },
    { label: "Professional title and specialty", done: Boolean(professional.title && professional.specialty) },
    { label: "Professional biography", done: professional.bio.trim().length >= 40 },
    { label: "Professional licence", done: Boolean(professional.licenseNumber) },
    { label: "Credentials", done: professional.credentials.length > 0 },
    { label: "Education", done: Boolean(professional.education && professional.institution) },
    { label: "Languages", done: professional.languages.length > 0 },
    { label: "Employment history", done: professional.employmentHistory.length > 0 },
    { label: "Preferred locations", done: professional.preferences.locations.length > 0 },
    { label: "Availability", done: Boolean(professional.preferences.availability) },
  ];
  const completed = checks.filter((check) => check.done).length;
  return {
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((check) => !check.done).map((check) => check.label),
  };
}

export function matchesProfessional(professional: Professional, opportunity: Opportunity) {
  if (opportunity.status !== "PUBLISHED") return false;
  if (professional.status !== "ACTIVE" || professional.verificationStatus === "REJECTED") return false;
  if (professional.category !== opportunity.category) return false;
  if (opportunity.minYears > professional.yearsExperience + 1) return false;

  const normal = (value: string) => value.trim().toLowerCase();
  const specialty = normal(professional.specialty);
  const required = normal(opportunity.specialty);
  const departmentMatch = professional.preferences.departments.some((department) => {
    const value = normal(department);
    return value === required || required.includes(value) || value.includes(required);
  });
  const specialtyMatch =
    !specialty ||
    !required ||
    specialty === required ||
    specialty.includes(required) ||
    required.includes(specialty) ||
    departmentMatch;
  if (!specialtyMatch) return false;

  const location = normal(opportunity.location);
  const preferred = professional.preferences.locations.map(normal);
  const locationMatch =
    preferred.length === 0 ||
    preferred.some((value) => value === location || location.includes(value) || value.includes(location)) ||
    normal(professional.city) === location;
  if (!locationMatch) return false;

  const employmentPreferences = professional.preferences.employmentTypes;
  if (
    employmentPreferences.length > 0 &&
    !employmentPreferences.includes(opportunity.employmentType)
  ) {
    return false;
  }

  return true;
}

export function matchingOpportunities(professional: Professional) {
  return state.opportunities
    .filter((opportunity) => matchesProfessional(professional, opportunity))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

/* -------------------------------------------------------------------------- */
/*                            Internal mutations                              */
/* -------------------------------------------------------------------------- */

function notify(
  professionalId: string,
  input: {
    type: WorkforceNotificationType;
    title: string;
    message: string;
    opportunityId?: string;
    applicationId?: string;
    interviewId?: string;
    offerId?: string;
  },
) {
  const notification: WorkforceNotification = {
    id: createId("wf-ntf"),
    professionalId,
    type: input.type,
    title: input.title,
    message: input.message,
    createdAt: nowISO(),
    isRead: false,
    opportunityId: input.opportunityId,
    applicationId: input.applicationId,
    interviewId: input.interviewId,
    offerId: input.offerId,
  };
  state = { ...state, notifications: [notification, ...state.notifications] };
}

function notifyMatchingProfessionals(opportunity: Opportunity) {
  const employer = employerById(opportunity.employerId);
  if (!employer) return;
  state.professionals
    .filter((professional) => matchesProfessional(professional, opportunity))
    .forEach((professional) => {
      notify(professional.id, {
        type: "NEW_OPPORTUNITY",
        title: "New opportunity matching your specialty",
        message: `${employer.name} has published a new ${opportunity.title} ${
          opportunity.isShift ? "shift" : "position"
        } in ${opportunity.location}.`,
        opportunityId: opportunity.id,
      });
    });
}

function pushTimeline(application: Application, label: string, note?: string): Application {
  return {
    ...application,
    updatedAt: nowISO(),
    timeline: [...application.timeline, { label, at: nowISO(), note }],
  };
}

function replaceApplication(next: Application) {
  state = {
    ...state,
    applications: state.applications.map((application) =>
      application.id === next.id ? next : application,
    ),
  };
}

function replaceOpportunity(next: Opportunity) {
  state = {
    ...state,
    opportunities: state.opportunities.map((opportunity) =>
      opportunity.id === next.id ? next : opportunity,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */

export function loginProfessional(email: string, password: string): Professional {
  const normalised = email.trim().toLowerCase();
  const account = state.accounts.find((item) => item.email.toLowerCase() === normalised);
  const professional = account
    ? state.professionals.find((person) => person.id === account.professionalId)
    : undefined;

  if (!account || !professional || account.password !== password) {
    throw new Error("The email or password you entered is incorrect.");
  }
  if (professional.status === "SUSPENDED") {
    throw new Error("This account is currently unavailable. Contact MyHealth support for help.");
  }

  setState({ ...state, sessionProfessionalId: professional.id });
  return professional;
}

export function logoutProfessional() {
  setState({ ...state, sessionProfessionalId: null });
}

export function registerProfessional(input: ProfessionalRegistrationInput): Professional {
  const email = input.email.trim().toLowerCase();
  if (state.accounts.some((account) => account.email.toLowerCase() === email)) {
    throw new Error("An account already exists for this email address.");
  }

  const professional: Professional = {
    id: createId("wf-pro"),
    firstName: input.firstName.trim(),
    middleName: input.middleName?.trim() || undefined,
    lastName: input.lastName.trim(),
    email,
    phone: input.phone.trim(),
    city: input.city.trim(),
    region: input.region.trim(),
    category: input.category,
    specialty: input.specialty.trim(),
    title: input.title.trim(),
    yearsExperience: Number(input.yearsExperience) || 0,
    education: input.education.trim(),
    institution: input.institution.trim(),
    graduationYear: Number(input.graduationYear) || new Date().getFullYear(),
    licenseNumber: input.licenseNumber.trim(),
    languages: input.languages,
    bio: input.bio.trim(),
    credentials: input.licenseNumber
      ? [
          {
            id: createId("wf-cred"),
            name: "Professional licence",
            issuer: "Self-submitted",
            issuedAt: todayISO(),
            status: "UPLOADED",
          },
        ]
      : [],
    certifications: [],
    employmentHistory: [],
    preferences: {
      locations: [input.city.trim()],
      employmentTypes: ["FULL_TIME", "PART_TIME", "TEMPORARY", "CONTRACT", "FREELANCE", "SHIFT"],
      availability: "Available immediately",
      departments: [],
    },
    verificationStatus: "PENDING",
    status: "ACTIVE",
    savedOpportunityIds: [],
    createdAt: nowISO(),
  };

  state = {
    ...state,
    professionals: [professional, ...state.professionals],
    accounts: [
      ...state.accounts,
      { professionalId: professional.id, email, password: input.password },
    ],
    sessionProfessionalId: professional.id,
  };
  notify(professional.id, {
    type: "CREDENTIAL_REVIEW",
    title: "Your professional profile is under review",
    message:
      "Your licence details were submitted for review. You can continue exploring opportunities and applying while verification is completed.",
  });
  emit();
  return professional;
}

export function updateProfessional(
  professionalId: string,
  patch: Partial<
    Pick<
      Professional,
      | "firstName"
      | "middleName"
      | "lastName"
      | "phone"
      | "city"
      | "region"
      | "specialty"
      | "category"
      | "title"
      | "yearsExperience"
      | "education"
      | "institution"
      | "graduationYear"
      | "licenseNumber"
      | "languages"
      | "bio"
      | "preferences"
    >
  >,
) {
  setState({
    ...state,
    professionals: state.professionals.map((person) =>
      person.id === professionalId ? { ...person, ...patch } : person,
    ),
  });
}

export function addCredential(
  professionalId: string,
  input: { name: string; issuer: string; issuedAt: string; expiresAt?: string },
) {
  setState({
    ...state,
    professionals: state.professionals.map((person) =>
      person.id === professionalId
        ? {
            ...person,
            credentials: [
              ...person.credentials,
              { ...input, id: createId("wf-cred"), status: "UPLOADED" },
            ],
          }
        : person,
    ),
  });
}

export function toggleSavedOpportunity(professionalId: string, opportunityId: string) {
  setState({
    ...state,
    professionals: state.professionals.map((person) => {
      if (person.id !== professionalId) return person;
      const saved = person.savedOpportunityIds.includes(opportunityId);
      return {
        ...person,
        savedOpportunityIds: saved
          ? person.savedOpportunityIds.filter((id) => id !== opportunityId)
          : [...person.savedOpportunityIds, opportunityId],
      };
    }),
  });
}

export function applyToOpportunity(
  professionalId: string,
  opportunityId: string,
  coverMessage: string,
): Application {
  const opportunity = opportunityById(opportunityId);
  if (!opportunity) throw new Error("This opportunity is no longer available.");
  if (opportunity.status !== "PUBLISHED") {
    throw new Error("This opportunity is not accepting applications.");
  }
  if (opportunity.applicationDeadline < todayISO()) {
    throw new Error("The application deadline for this opportunity has passed.");
  }
  if (opportunity.filled >= opportunity.vacancies) {
    throw new Error("This opportunity has already been filled.");
  }
  if (state.applications.some((application) => application.opportunityId === opportunityId && application.professionalId === professionalId)) {
    throw new Error("You have already applied for this opportunity.");
  }

  const timestamp = nowISO();
  const application: Application = {
    id: createId("wf-app"),
    opportunityId,
    professionalId,
    submittedAt: timestamp,
    updatedAt: timestamp,
    status: "SUBMITTED",
    coverMessage: coverMessage.trim(),
    timeline: [{ label: "Application submitted", at: timestamp }],
  };

  state = { ...state, applications: [application, ...state.applications] };
  notify(professionalId, {
    type: "APPLICATION_RECEIVED",
    title: "Application submitted",
    message: `Your application for ${opportunity.title} at ${
      employerById(opportunity.employerId)?.name ?? "the hospital"
    } was received.`,
    opportunityId,
    applicationId: application.id,
  });
  emit();
  return application;
}

export function withdrawApplication(applicationId: string) {
  const application = applicationById(applicationId);
  if (!application) return;
  if (!["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(application.status)) {
    throw new Error("This application can no longer be withdrawn from this screen.");
  }
  replaceApplication(
    pushTimeline(
      { ...application, status: "WITHDRAWN" },
      "Application withdrawn",
      "Withdrawn by the applicant.",
    ),
  );
  emit();
}

export function markNotificationRead(notificationId: string) {
  setState({
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, isRead: true } : notification,
    ),
  });
}

export function markAllNotificationsRead(professionalId: string) {
  setState({
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.professionalId === professionalId ? { ...notification, isRead: true } : notification,
    ),
  });
}

export function createOpportunity(
  employerId: string,
  input: NewOpportunityInput,
  publish: boolean,
) {
  const opportunity: Opportunity = {
    ...input,
    id: createId("wf-op"),
    employerId,
    filled: 0,
    postedAt: nowISO(),
    status: publish ? "PUBLISHED" : "DRAFT",
  };
  state = { ...state, opportunities: [opportunity, ...state.opportunities] };
  if (publish) notifyMatchingProfessionals(opportunity);
  emit();
  return opportunity;
}

export function setOpportunityStatus(opportunityId: string, status: OpportunityStatus) {
  const opportunity = opportunityById(opportunityId);
  if (!opportunity) return;
  const next: Opportunity = {
    ...opportunity,
    status,
    postedAt: status === "PUBLISHED" && opportunity.status !== "PUBLISHED" ? nowISO() : opportunity.postedAt,
  };
  replaceOpportunity(next);
  if (status === "PUBLISHED") notifyMatchingProfessionals(next);
  if (status === "CLOSED") {
    state.applications
      .filter(
        (application) =>
          application.opportunityId === opportunityId &&
          ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(application.status),
      )
      .forEach((application) => {
        notify(application.professionalId, {
          type: "APPLICATION_REJECTED",
          title: "Opportunity closed",
          message: `${next.title} at ${
            employerById(next.employerId)?.name ?? "the hospital"
          } has closed. Your application will not progress further.`,
          opportunityId,
          applicationId: application.id,
        });
      });
  }
  emit();
}

export function moveApplication(
  applicationId: string,
  status: ApplicationStatus,
  note?: string,
) {
  const application = applicationById(applicationId);
  if (!application) return;
  const opportunity = opportunityById(application.opportunityId);
  const next = pushTimeline({ ...application, status }, `Status updated: ${
    status.replace(/_/g, " ").toLowerCase()
  }`, note);
  replaceApplication(next);

  const notificationType: WorkforceNotificationType | null =
    status === "UNDER_REVIEW"
      ? "APPLICATION_UNDER_REVIEW"
      : status === "SHORTLISTED"
        ? "APPLICATION_SHORTLISTED"
        : status === "REJECTED"
          ? "APPLICATION_REJECTED"
          : null;
  if (notificationType) {
    notify(application.professionalId, {
      type: notificationType,
      title:
        notificationType === "APPLICATION_SHORTLISTED"
          ? "You have been shortlisted"
          : notificationType === "APPLICATION_REJECTED"
            ? "Application update"
            : "Application under review",
      message: `${opportunity?.title ?? "Your application"} at ${
        opportunity ? employerById(opportunity.employerId)?.name : "the hospital"
      }: ${note || NOTIFICATION_TYPE_LABELS[notificationType]}.`,
      opportunityId: application.opportunityId,
      applicationId,
    });
  }
  emit();
}

export function scheduleInterview(
  applicationId: string,
  input: { scheduledAt: string; location: string; instructions: string },
) {
  const application = applicationById(applicationId);
  if (!application) throw new Error("Application not found.");
  if (state.interviews.some((interview) => interview.applicationId === applicationId)) {
    throw new Error("An interview already exists for this applicant.");
  }
  const opportunity = opportunityById(application.opportunityId);
  const interview: Interview = {
    id: createId("wf-int"),
    applicationId,
    scheduledAt: input.scheduledAt,
    location: input.location.trim(),
    instructions: input.instructions.trim(),
    status: "INVITED",
    updatedAt: nowISO(),
  };
  state = { ...state, interviews: [interview, ...state.interviews] };
  replaceApplication(
    pushTimeline(
      { ...application, status: "INTERVIEW_SCHEDULED" },
      "Interview invitation sent",
      `${new Date(input.scheduledAt).toLocaleString()} · ${input.location}`,
    ),
  );
  notify(application.professionalId, {
    type: "INTERVIEW_INVITATION",
    title: "Interview invitation",
    message: `You are invited to interview for ${opportunity?.title ?? "your application"} at ${
      opportunity ? employerById(opportunity.employerId)?.name : "the hospital"
    }.`,
    opportunityId: application.opportunityId,
    applicationId,
    interviewId: interview.id,
  });
  emit();
  return interview;
}

export function cancelInterview(interviewId: string) {
  const interview = interviewById(interviewId);
  if (!interview) return;
  const application = applicationById(interview.applicationId);
  state = {
    ...state,
    interviews: state.interviews.map((item) =>
      item.id === interviewId ? { ...item, status: "CANCELLED", updatedAt: nowISO() } : item,
    ),
  };
  if (application) {
    replaceApplication(
      pushTimeline({ ...application, status: "SHORTLISTED" }, "Interview cancelled"),
    );
    notify(application.professionalId, {
      type: "INTERVIEW_UPDATED",
      title: "Interview cancelled",
      message: "The hospital cancelled your interview. The recruitment team will be in touch.",
      applicationId: application.id,
      interviewId,
    });
  }
  emit();
}

export function respondToInterview(
  interviewId: string,
  status: Extract<InterviewStatus, "CONFIRMED" | "RESCHEDULE_REQUESTED" | "DECLINED">,
  note?: string,
) {
  const interview = interviewById(interviewId);
  if (!interview) return;
  const application = applicationById(interview.applicationId);
  state = {
    ...state,
    interviews: state.interviews.map((item) =>
      item.id === interviewId
        ? { ...item, status, professionalNote: note, updatedAt: nowISO() }
        : item,
    ),
  };
  if (application) {
    const label =
      status === "CONFIRMED"
        ? "Interview confirmed"
        : status === "RESCHEDULE_REQUESTED"
          ? "Reschedule requested"
          : "Interview declined";
    replaceApplication(pushTimeline(application, label, note));
  }
  emit();
}

export function sendOffer(
  applicationId: string,
  input: {
    salary: number;
    salaryPeriod: SalaryPeriod;
    startDate: string;
    workingHours: string;
    contractDuration: string;
    conditions: string;
    responseDeadline: string;
  },
) {
  const application = applicationById(applicationId);
  if (!application) throw new Error("Application not found.");
  if (application.status !== "SHORTLISTED" && application.status !== "INTERVIEW_SCHEDULED") {
    throw new Error("Only shortlisted applicants can receive an offer.");
  }
  const opportunity = opportunityById(application.opportunityId);
  const offer: Offer = {
    id: createId("wf-ofr"),
    applicationId,
    salary: input.salary,
    salaryPeriod: input.salaryPeriod,
    startDate: input.startDate,
    workingHours: input.workingHours,
    contractDuration: input.contractDuration,
    conditions: input.conditions,
    responseDeadline: input.responseDeadline,
    status: "SENT",
    sentAt: nowISO(),
  };
  state = { ...state, offers: [offer, ...state.offers] };
  replaceApplication(
    pushTimeline({ ...application, status: "OFFER_RECEIVED" }, "Offer sent", `${input.salary.toLocaleString()} ETB`),
  );
  notify(application.professionalId, {
    type: "OFFER_RECEIVED",
    title: "Job offer received",
    message: `${opportunity ? employerById(opportunity.employerId)?.name : "The hospital"} has sent you an offer for ${
      opportunity?.title ?? "the position"
    }.`,
    opportunityId: application.opportunityId,
    applicationId,
    offerId: offer.id,
  });
  emit();
  return offer;
}

export function withdrawOffer(offerId: string) {
  const offer = offerById(offerId);
  if (!offer) return;
  const application = applicationById(offer.applicationId);
  state = {
    ...state,
    offers: state.offers.map((item) =>
      item.id === offerId ? { ...item, status: "WITHDRAWN", respondedAt: nowISO() } : item,
    ),
  };
  if (application) {
    replaceApplication(pushTimeline({ ...application, status: "SHORTLISTED" }, "Offer withdrawn"));
    notify(application.professionalId, {
      type: "OFFER_DECLINED",
      title: "Offer withdrawn",
      message: "The hospital withdrew its offer. You can continue applying for other opportunities.",
      applicationId: application.id,
      offerId,
    });
  }
  emit();
}

export function respondToOffer(offerId: string, accept: boolean) {
  const offer = offerById(offerId);
  if (!offer || offer.status !== "SENT") return;
  const application = applicationById(offer.applicationId);
  if (!application) return;
  const opportunity = opportunityById(application.opportunityId);
  const employer = opportunity ? employerById(opportunity.employerId) : undefined;

  state = {
    ...state,
    offers: state.offers.map((item) =>
      item.id === offerId
        ? { ...item, status: accept ? "ACCEPTED" : "DECLINED", respondedAt: nowISO() }
        : item,
    ),
  };

  if (accept && opportunity) {
    const filled = opportunity.filled + 1;
    replaceOpportunity({
      ...opportunity,
      filled,
      status: filled >= opportunity.vacancies ? "FILLED" : opportunity.status,
    });
    const assignment: Assignment = {
      id: createId("wf-asg"),
      professionalId: application.professionalId,
      opportunityId: opportunity.id,
      employerId: opportunity.employerId,
      title: opportunity.title,
      startDate: offer.startDate,
      status: "UPCOMING",
      compensation: `${offer.salary.toLocaleString()} ETB ${SALARY_PERIOD_LABELS[offer.salaryPeriod]}`,
      confirmedAt: nowISO(),
    };
    state = { ...state, assignments: [assignment, ...state.assignments] };
    notify(application.professionalId, {
      type: "ASSIGNMENT_UPDATE",
      title: "Assignment confirmed",
      message: `Your assignment as ${opportunity.title} at ${employer?.name ?? "the hospital"} starts on ${offer.startDate}.`,
      opportunityId: opportunity.id,
      applicationId: application.id,
      offerId,
    });
  } else {
    notify(application.professionalId, {
      type: "OFFER_DECLINED",
      title: "Offer declined",
      message: "You declined the offer. Your application has been updated.",
      applicationId: application.id,
      offerId,
    });
  }

  replaceApplication(
    pushTimeline(
      { ...application, status: accept ? "ACCEPTED" : "REJECTED" },
      accept ? "Offer accepted" : "Offer declined",
    ),
  );
  emit();
}

export function reviewProfessional(professionalId: string, status: VerificationStatus) {
  setState({
    ...state,
    professionals: state.professionals.map((person) =>
      person.id === professionalId ? { ...person, verificationStatus: status } : person,
    ),
  });
  notify(professionalId, {
    type: "CREDENTIAL_REVIEW",
    title: status === "VERIFIED" ? "Credentials verified" : "Credential review update",
    message:
      status === "VERIFIED"
        ? "Your professional credentials have been reviewed and verified."
        : "Your credential submission needs attention. Please review your profile and resubmit.",
  });
}

export function setProfessionalAccountStatus(
  professionalId: string,
  status: WorkforceAccountStatus,
) {
  setState({
    ...state,
    professionals: state.professionals.map((person) =>
      person.id === professionalId ? { ...person, status } : person,
    ),
  });
}

export function reportOpportunity(opportunityId: string) {
  const opportunity = opportunityById(opportunityId);
  if (!opportunity) return;
  setState({
    ...state,
    opportunities: state.opportunities.map((item) =>
      item.id === opportunityId ? { ...item, status: "CLOSED" } : item,
    ),
  });
  state.applications
    .filter((application) => application.opportunityId === opportunityId)
    .forEach((application) => {
      notify(application.professionalId, {
        type: "APPLICATION_REJECTED",
        title: "Listing removed",
        message: `${opportunity.title} is no longer available on MyHealth Workforce.`,
        opportunityId,
        applicationId: application.id,
      });
    });
  emit();
}
