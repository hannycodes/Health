import {
  Building2,
  ChevronRight,
  Compass,
  HeartPulse,
  Network,
  Sparkles,
  UserRound,
  FileHeart,
} from "lucide-react";

import { Reveal } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

const PILLARS = [
  {
    icon: Compass,
    title: "Discover",
    description:
      "Explore hospitals, departments, doctors, and available appointments in one place.",
  },
  {
    icon: Network,
    title: "Coordinate",
    description:
      "Connect patient appointments, doctors, hospital operations, and relevant medical information.",
  },
  {
    icon: Sparkles,
    title: "Understand",
    description:
      "Use AI-assisted healthcare navigation and clinician-support tools to make information easier to understand and manage.",
  },
];

function FlowNode({
  icon: Icon,
  label,
  detail,
  highlight = false,
}: {
  icon: typeof UserRound;
  label: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "border-primary/30 bg-white px-4 py-3 shadow-sm sm:px-6"
          : "border-line bg-white/70 px-4 py-3 sm:px-5"
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className={
            highlight
              ? "bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg"
              : "bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-lg"
          }
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold sm:text-sm">{label}</p>
          <p className="text-ink-muted text-[11px]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function Solution() {
  return (
    <section id="solution" className="scroll-mt-24 bg-brand-mint/50 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHeading
            eyebrow="Our solution"
            title="One Platform. A More Connected Healthcare Journey."
            description="MyHealth sits between patients and the healthcare system, giving every participant a shared, coordinated experience."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 90}>
              <div className="bg-card h-full rounded-2xl border p-6 shadow-[var(--shadow-card)]">
                <span className="bg-brand text-primary-foreground flex size-10 items-center justify-center rounded-xl">
                  <pillar.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-base font-semibold">
                  {pillar.title}
                </h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 rounded-2xl border border-line bg-white/80 p-6 sm:p-8">
            <p className="text-ink-muted mb-5 text-center text-[11px] font-semibold tracking-[0.16em] uppercase">
              How the pieces connect
            </p>

            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
              <FlowNode icon={UserRound} label="Patient" detail="Seeks care" />
              <ChevronRight
                className="text-ink-muted size-4 rotate-90 sm:rotate-0"
                aria-hidden="true"
              />
              <FlowNode
                icon={HeartPulse}
                label="MyHealth"
                detail="Coordinates the journey"
                highlight
              />
              <ChevronRight
                className="text-ink-muted size-4 rotate-90 sm:rotate-0"
                aria-hidden="true"
              />
              <FlowNode icon={Building2} label="Hospitals & doctors" detail="Deliver care" />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: FileHeart, label: "Medical information" },
                { icon: Sparkles, label: "AI assistance" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="text-ink-muted inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[11px]"
                >
                  <item.icon className="text-brand size-3" aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
