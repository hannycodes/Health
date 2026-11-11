export const PROFESSIONAL_CATEGORIES = [
  "GENERAL_PRACTITIONER",
  "MEDICAL_SPECIALIST",
  "REGISTERED_NURSE",
  "MIDWIFE",
  "LABORATORY_TECHNOLOGIST",
  "PHARMACIST",
  "OTHER",
] as const;
export type ProfessionalCategory = (typeof PROFESSIONAL_CATEGORIES)[number];

export const PROFESSIONAL_CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  GENERAL_PRACTITIONER: "General Practitioner",
  MEDICAL_SPECIALIST: "Medical Specialist",
  REGISTERED_NURSE: "Registered Nurse",
  MIDWIFE: "Midwife",
  LABORATORY_TECHNOLOGIST: "Laboratory Technologist",
  PHARMACIST: "Pharmacist",
  OTHER: "Other Healthcare Professional",
};

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "TEMPORARY",
  "CONTRACT",
  "FREELANCE",
  "SHIFT",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  TEMPORARY: "Temporary",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  SHIFT: "Shift-based",
};

export const SALARY_PERIODS = ["MONTH", "DAY", "SHIFT", "HOUR"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  MONTH: "per month",
  DAY: "per day",
  SHIFT: "per shift",
  HOUR: "per hour",
};

export const EXPERIENCE_LEVELS = ["ENTRY", "MID", "SENIOR"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: "Entry level",
  MID: "Mid level",
  SENIOR: "Senior level",
};

export type OpportunityStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "FILLED";

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "OFFER_RECEIVED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  OFFER_RECEIVED: "Offer received",
  ACCEPTED: "Accepted",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

export const APPLICATION_STATUS_TONE: Record<
  ApplicationStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  SHORTLISTED: "warning",
  INTERVIEW_SCHEDULED: "info",
  OFFER_RECEIVED: "success",
  ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

export type VerificationStatus = "VERIFIED" | "PENDING" | "REJECTED";
export type WorkforceAccountStatus = "ACTIVE" | "SUSPENDED";

export const NOTIFICATION_TYPES = [
  "NEW_OPPORTUNITY",
  "APPLICATION_RECEIVED",
  "APPLICATION_UNDER_REVIEW",
  "APPLICATION_SHORTLISTED",
  "APPLICATION_REJECTED",
  "INTERVIEW_INVITATION",
  "INTERVIEW_UPDATED",
  "OFFER_RECEIVED",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "SHIFT_REMINDER",
  "ASSIGNMENT_UPDATE",
  "CREDENTIAL_REVIEW",
] as const;
export type WorkforceNotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<WorkforceNotificationType, string> = {
  NEW_OPPORTUNITY: "New opportunities",
  APPLICATION_RECEIVED: "Applications",
  APPLICATION_UNDER_REVIEW: "Applications",
  APPLICATION_SHORTLISTED: "Applications",
  APPLICATION_REJECTED: "Applications",
  INTERVIEW_INVITATION: "Interviews",
  INTERVIEW_UPDATED: "Interviews",
  OFFER_RECEIVED: "Offers",
  OFFER_ACCEPTED: "Offers",
  OFFER_DECLINED: "Offers",
  SHIFT_REMINDER: "Assignments",
  ASSIGNMENT_UPDATE: "Assignments",
  CREDENTIAL_REVIEW: "Credentials",
};

export interface Credential {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  status: "UPLOADED" | "VERIFIED" | "REJECTED";
}

export interface EmploymentHistoryEntry {
  id: string;
  role: string;
  organisation: string;
  startYear: number;
  endYear?: number;
  summary?: string;
}

export interface ProfessionalPreferences {
  locations: string[];
  employmentTypes: EmploymentType[];
  expectedSalary?: number;
  availability: string;
  departments: string[];
}

export interface Professional {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  region: string;
  category: ProfessionalCategory;
  specialty: string;
  title: string;
  yearsExperience: number;
  education: string;
  institution: string;
  graduationYear: number;
  licenseNumber: string;
  licenseExpiry?: string;
  languages: string[];
  bio: string;
  credentials: Credential[];
  certifications: string[];
  employmentHistory: EmploymentHistoryEntry[];
  preferences: ProfessionalPreferences;
  verificationStatus: VerificationStatus;
  status: WorkforceAccountStatus;
  savedOpportunityIds: string[];
  createdAt: string;
}

export interface WorkforceAccount {
  professionalId: string;
  email: string;
  password: string;
}

export interface Employer {
  id: string;
  name: string;
  city: string;
  region: string;
  initials: string;
  about: string;
  departments: string[];
  verified: boolean;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  employerId: string;
  title: string;
  department: string;
  category: ProfessionalCategory;
  specialty: string;
  vacancies: number;
  filled: number;
  employmentType: EmploymentType;
  isShift: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod: SalaryPeriod;
  minYears: number;
  experienceLevel: ExperienceLevel;
  qualifications: string[];
  licenseRequired: string;
  skills: string[];
  languages: string[];
  location: string;
  startDate: string;
  workingHours: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  description: string;
  responsibilities: string[];
  benefits: string[];
  postedAt: string;
  applicationDeadline: string;
  status: OpportunityStatus;
}

export type NewOpportunityInput = Omit<
  Opportunity,
  "id" | "postedAt" | "filled" | "status" | "employerId"
>;

export interface ApplicationTimelineEvent {
  label: string;
  at: string;
  note?: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  professionalId: string;
  submittedAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  coverMessage: string;
  timeline: ApplicationTimelineEvent[];
}

export type InterviewStatus =
  | "INVITED"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED";

export interface Interview {
  id: string;
  applicationId: string;
  scheduledAt: string;
  location: string;
  instructions: string;
  status: InterviewStatus;
  professionalNote?: string;
  updatedAt: string;
}

export type OfferStatus = "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

export interface Offer {
  id: string;
  applicationId: string;
  salary: number;
  salaryPeriod: SalaryPeriod;
  startDate: string;
  workingHours: string;
  contractDuration: string;
  conditions: string;
  responseDeadline: string;
  status: OfferStatus;
  sentAt: string;
  respondedAt?: string;
}

export interface WorkforceNotification {
  id: string;
  professionalId: string;
  type: WorkforceNotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  opportunityId?: string;
  applicationId?: string;
  interviewId?: string;
  offerId?: string;
}

export type AssignmentStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Assignment {
  id: string;
  professionalId: string;
  opportunityId: string;
  employerId: string;
  title: string;
  startDate: string;
  endDate?: string;
  status: AssignmentStatus;
  compensation: string;
  confirmedAt: string;
}

export interface WorkforceState {
  professionals: Professional[];
  accounts: WorkforceAccount[];
  employers: Employer[];
  opportunities: Opportunity[];
  applications: Application[];
  interviews: Interview[];
  offers: Offer[];
  notifications: WorkforceNotification[];
  assignments: Assignment[];
  sessionProfessionalId: string | null;
}

export interface ProfessionalRegistrationInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  region: string;
  password: string;
  category: ProfessionalCategory;
  specialty: string;
  title: string;
  yearsExperience: number;
  education: string;
  institution: string;
  graduationYear: number;
  licenseNumber: string;
  languages: string[];
  bio: string;
}
