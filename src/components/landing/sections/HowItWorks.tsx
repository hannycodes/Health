import {
  BellRing,
  CalendarPlus,
  ChevronRight,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { Reveal } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

const JOURNEY = [
  { icon: UserRound, label: "Patient" },
  { icon: Search, label: "Discover" },
  { icon: CalendarPlus, label: "Book" },
  { icon: Stethoscope, label: "Visit doctor" },
  { icon: BellRing, label: "Stay connected" },
];

const STEPS = [
  {
    title: "Create Your Account",
    description: "Patients register and create their healthcare profile.",
  },
  {
    title: "Discover Healthcare",
    description: "Explore hospitals, doctors, departments, and available services.",
  },
  {
    title: "Book an Appointment",
    description: "Select a suitable doctor and available appointment slot.",
  },
  {
    title: "Stay Connected",
    description:
      "Manage appointments, access authorized medical history, and receive support throughout the journey.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="A Simpler Healthcare Journey, From Start to Finish."
            description="From finding the right doctor to keeping your care in one place, each step is designed to remove friction."
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 rounded-2xl border border-line bg-brand-mint/40 p-5 sm:p-6">
            <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              {JOURNEY.map((step, index) => (
                <li key={step.label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-line/80 bg-white px-3 py-2.5">
                    <span className="bg-brand-mint text-brand flex size-7 shrink-0 items-center justify-center rounded-md">
                      <step.icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-medium sm:text-xs">{step.label}</span>
                  </div>
                  {index < JOURNEY.length - 1 && (
                    <ChevronRight
                      className="text-ink-muted hidden size-4 shrink-0 sm:block"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 70}>
              <div className="relative h-full rounded-2xl border border-line bg-white p-5">
                <span className="font-display text-brand/25 text-2xl font-extrabold tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-2 text-sm font-semibold">{step.title}</h3>
                <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
