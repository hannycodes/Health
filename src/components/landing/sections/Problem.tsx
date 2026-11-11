import { Compass, Files, Unlink } from "lucide-react";

import { Reveal } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

const PROBLEMS = [
  {
    icon: Files,
    title: "Fragmented Healthcare Information",
    description:
      "Patient information can be scattered across different facilities and documents, making it difficult to maintain continuity.",
  },
  {
    icon: Compass,
    title: "Difficult Healthcare Navigation",
    description:
      "Patients may struggle to discover suitable hospitals, identify specialists, and understand how to access services.",
  },
  {
    icon: Unlink,
    title: "Disconnected Experiences",
    description:
      "Appointments, doctors, patient information, and hospital operations often require separate processes.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-24 border-t border-line/70 bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHeading
            eyebrow="The problem"
            title="Healthcare Should Feel Connected."
            description="The journey between a symptom and the right care is often harder than it needs to be — not because of a lack of providers, but because the pieces are not connected."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((problem, index) => (
            <Reveal key={problem.title} delay={index * 90}>
              <div className="group h-full rounded-2xl border border-line bg-white p-6 transition-colors duration-300 hover:border-primary/30 hover:bg-brand-mint/40">
                <span className="bg-brand-mint text-brand flex size-10 items-center justify-center rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <problem.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-base font-semibold">
                  {problem.title}
                </h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  {problem.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
