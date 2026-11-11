import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { employerById } from "./store";
import { createWorkforceSeed } from "./data";
import { OpportunityCard, WorkforcePublicHeader } from "./components";
import { EMPLOYMENT_TYPE_LABELS } from "./types";

const seed = createWorkforceSeed();
const featured = seed.opportunities
  .filter((opportunity) => opportunity.status === "PUBLISHED")
  .slice(0, 3);
const featuredEmployer = seed.employers[0];
const featuredProfessional = seed.professionals[0];

const PROFESSIONAL_STEPS = [
  {
    title: "Create your professional profile",
    description: "Add your specialty, qualifications, licence and availability once.",
    icon: BadgeCheck,
  },
  {
    title: "Explore relevant opportunities",
    description: "See permanent roles and temporary shifts matched to your expertise.",
    icon: Search,
  },
  {
    title: "Apply with confidence",
    description: "Submit your profile and track every application in one place.",
    icon: ClipboardList,
  },
  {
    title: "Get hired and manage assignments",
    description: "Confirm interviews, respond to offers and keep upcoming work organised.",
    icon: CalendarClock,
  },
];

const HOSPITAL_STEPS = [
  {
    title: "Register your facility",
    description: "Work from the hospital account you already use across MyHealth.",
    icon: Building2,
  },
  {
    title: "Publish opportunities",
    description: "Create permanent vacancies or short-term shift cover in minutes.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Review qualified applicants",
    description: "See verified profiles, experience and credentials in one pipeline.",
    icon: UsersRound,
  },
  {
    title: "Recruit healthcare professionals",
    description: "Shortlist, interview and send offers without leaving the platform.",
    icon: HeartPulse,
  },
];

const REASONS = [
  {
    title: "Built for healthcare",
    description:
      "Every opportunity is structured around clinical roles, specialties, licensing and shift patterns.",
    icon: Stethoscope,
  },
  {
    title: "Professional profiles",
    description:
      "Qualifications, licence details, experience and preferences live in one shareable profile.",
    icon: BadgeCheck,
  },
  {
    title: "Relevant matching",
    description:
      "Opportunity alerts are matched to specialty, category, location, experience and availability.",
    icon: Sparkles,
  },
  {
    title: "Application tracking",
    description:
      "Follow each application from submission through interview, offer and confirmed assignment.",
    icon: ClipboardList,
  },
  {
    title: "Recruitment tools",
    description:
      "Hospitals manage vacancies, applicants, interviews and offers from a single workspace.",
    icon: Building2,
  },
  {
    title: "Centralised workforce",
    description:
      "Upcoming assignments and completed shifts stay connected to your MyHealth workspace.",
    icon: CalendarClock,
  },
];

export function WorkforceLandingPage() {
  return (
    <div className="bg-background min-h-screen">
      <WorkforcePublicHeader />

      <main>
        <section className="from-brand-mint/70 via-background to-background relative overflow-hidden bg-gradient-to-b">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-6">
              <Badge variant="outline" className="border-primary/20 bg-background/70 gap-1.5">
                <HeartPulse className="size-3.5 text-primary" />
                MyHealth Workforce
              </Badge>
              <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
                Your Healthcare Career, Connected.
              </h1>
              <p className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg">
                Discover healthcare opportunities, connect with hospitals, and find
                professional opportunities that match your expertise.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/workforce/register">
                    Explore Opportunities
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Hire Healthcare Professionals</Link>
                </Button>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  Verified hospital accounts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BellRing className="size-4 text-primary" />
                  Matched opportunity alerts
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card relative rounded-2xl border p-4 shadow-[var(--shadow-card)] sm:p-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold">Open healthcare positions</p>
                    <p className="text-muted-foreground text-xs">Matched to your profile</p>
                  </div>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <div className="space-y-2.5 py-3">
                  {featured.map((opportunity) => (
                    <div
                      key={opportunity.id}
                      className="hover:border-primary/30 flex items-center gap-3 rounded-lg border p-2.5 transition-colors"
                    >
                      <span className="bg-brand-mint text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold">
                        {employerById(opportunity.employerId)?.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{opportunity.title}</p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {employerById(opportunity.employerId)?.name} · {opportunity.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {EMPLOYMENT_TYPE_LABELS[opportunity.employmentType]}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="bg-brand-mint/60 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-background text-primary flex size-7 items-center justify-center rounded-full text-[10px] font-semibold">
                        {featuredProfessional.firstName[0]}
                        {featuredProfessional.lastName[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold">
                          {featuredProfessional.title} {featuredProfessional.firstName}{" "}
                          {featuredProfessional.lastName}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {featuredProfessional.specialty} · {featuredProfessional.yearsExperience} yrs
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-2 text-[10px]">
                      Profile complete · Credentials verified
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="flex items-center gap-1 text-[10px] font-medium">
                      <BellRing className="text-primary size-3" />
                      New opportunity
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-[10px]">
                      {featuredEmployer.name} published a General Practitioner position.
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="text-primary size-4" />
                    <div>
                      <p className="text-[11px] font-medium">Recent applications</p>
                      <p className="text-muted-foreground text-[10px]">
                        2 under review · 1 interview scheduled
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
              </div>
              <div className="bg-primary text-primary-foreground absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl px-4 py-3 shadow-lg sm:flex">
                <BriefcaseBusiness className="size-4" />
                <span className="text-xs font-medium">Hospitals hiring across 5 regions</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                Opportunity highlights
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Roles hospitals are hiring for now
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/workforce/opportunities">
                Browse all opportunities
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featured.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} compact />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-brand-mint/40 border-y">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                How it works
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                A clearer path between clinical expertise and the hospitals that need it
              </h2>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div className="bg-background rounded-2xl border p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Stethoscope className="text-primary size-4" />
                  For healthcare professionals
                </h3>
                <ol className="mt-5 space-y-4">
                  {PROFESSIONAL_STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="bg-brand-mint text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div id="for-hospitals" className="bg-surface-dark rounded-2xl p-6 text-white">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Building2 className="size-4" />
                  For hospitals
                </h3>
                <ol className="mt-5 space-y-4">
                  {HOSPITAL_STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-sm text-white/65">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="text-primary text-xs font-semibold tracking-wider uppercase">
              Why MyHealth Workforce
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Recruitment designed around healthcare work
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              From permanent clinical appointments to weekend shift cover, the platform keeps
              professional records and hospital recruitment in the same trusted ecosystem.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((reason) => (
              <Card key={reason.title} className="h-full">
                <CardContent className="space-y-3">
                  <span className="bg-brand-mint text-primary flex size-9 items-center justify-center rounded-lg">
                    <reason.icon className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{reason.title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {reason.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-12">
            <div className="relative mx-auto max-w-2xl space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your next healthcare opportunity starts here.
              </h2>
              <p className="text-primary-foreground/80 text-sm sm:text-base">
                Build your professional profile, discover relevant roles and connect directly
                with hospital recruitment teams.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/workforce/register">Find Opportunities</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link to="/login">Hire Professionals</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MyHealth. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/workforce" className="hover:text-foreground">
              Workforce
            </Link>
            <Link to="/" className="hover:text-foreground">
              MyHealth home
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
