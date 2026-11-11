import { Compass, Network, Sparkles } from "lucide-react";

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
      </div>
    </section>
  );
}
