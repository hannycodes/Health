import { Check, HeartPulse, Stethoscope } from "lucide-react";

import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import { GetStartedDialog } from "../GetStartedDialog";
import { Reveal } from "../Reveal";

const PATIENT_POINTS = [
  "Discover hospitals and doctors",
  "Book appointments",
  "Access your medical history",
  "Receive AI-assisted navigation",
  "Stay informed through notifications",
];

const PROVIDER_POINTS = [
  "Manage hospital departments",
  "Coordinate doctors and appointments",
  "Access authorized patient records",
  "Review clinical history",
  "Use AI-assisted clinical documentation",
];

export function Audiences() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div
              id="for-patients"
              className="scroll-mt-24 h-full rounded-2xl border border-line bg-brand-mint/60 p-7 sm:p-9"
            >
              <span className="bg-white text-brand flex size-11 items-center justify-center rounded-xl border border-line shadow-xs">
                <HeartPulse className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-display text-ink mt-6 text-2xl leading-tight font-bold sm:text-[28px]">
                Healthcare That Puts You First.
              </h2>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed sm:text-[15px]">
                Discover healthcare services, connect with doctors, manage appointments,
                and keep track of your health information in one place.
              </p>

              <ul className="mt-6 space-y-2.5">
                {PATIENT_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <span className="bg-brand/10 text-brand mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-2.5" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <GetStartedDialog
                  trigger={
                    <Button className="w-full sm:w-auto">Explore Patient Experience</Button>
                  }
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div
              id="for-hospitals"
              className="bg-surface-dark dark-glow scroll-mt-24 flex h-full flex-col rounded-2xl border border-white/10 p-7 text-white sm:p-9"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-emerald-300">
                  <Stethoscope className="size-5" aria-hidden="true" />
                </span>
                <Logo size="xs" onDark to={null} />
              </div>

              <h2 className="font-display mt-6 text-2xl leading-tight font-bold sm:text-[28px]">
                Better Tools for Better Coordination.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-[15px]">
                Bring healthcare operations, appointments, patient information, and
                intelligent clinical assistance into one coordinated experience.
              </p>

              <ul className="mt-6 space-y-2.5">
                {PROVIDER_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-white/85">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <Check className="size-2.5" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button
                  variant="outline"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                  asChild
                >
                  <a href="/login">Explore Healthcare Solutions</a>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
