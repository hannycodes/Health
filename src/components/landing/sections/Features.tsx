import {
  Building2,
  CalendarCheck,
  FileHeart,
  FileText,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { Reveal } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

const FEATURES = [
  {
    icon: Building2,
    title: "Hospital Discovery",
    description: "Find approved healthcare facilities and explore their services.",
  },
  {
    icon: Stethoscope,
    title: "Doctor Discovery",
    description: "Explore doctors, departments, specialties, and availability.",
  },
  {
    icon: CalendarCheck,
    title: "Smart Appointments",
    description: "Book and manage appointments through a shared coordination system.",
  },
  {
    icon: FileHeart,
    title: "Connected Medical History",
    description:
      "Access relevant medical information and records with appropriate authorization.",
  },
  {
    icon: Sparkles,
    title: "AI Healthcare Navigator",
    description:
      "Get non-diagnostic guidance and help navigating healthcare services.",
  },
  {
    icon: FileText,
    title: "Doctor AI Assistant",
    description:
      "Help clinicians summarize authorized patient history and draft clinical documentation for review.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-y border-line/70 bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything You Need, Connected in One Place."
            description="A coordinated product surface for patients, doctors, hospitals, and platform administrators."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 80}>
              <div className="group hover:shadow-card h-full rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
                <span className="bg-brand-mint text-brand group-hover:bg-primary group-hover:text-primary-foreground flex size-10 items-center justify-center rounded-xl transition-colors">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-[15px] font-semibold">
                  {feature.title}
                </h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
