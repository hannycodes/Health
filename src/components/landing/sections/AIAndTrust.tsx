import {
  BadgeCheck,
  Fingerprint,
  KeyRound,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { Reveal } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Role-based access" },
  { icon: Lock, label: "Patient information protection" },
  { icon: KeyRound, label: "Authorized medical record access" },
  { icon: Fingerprint, label: "Secure authentication" },
  { icon: ScrollText, label: "Appropriate access logging" },
  { icon: BadgeCheck, label: "Responsible AI usage" },
];

export function AIAndTrust() {
  return (
    <section id="about" className="scroll-mt-24 bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHeading
            eyebrow="AI and trust"
            title="Intelligence That Supports Human Care."
            description="MyHealth uses AI in two distinct places — always as assistance, never as a replacement for professional judgment."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-brand-mint/40 p-6">
              <span className="bg-white text-brand flex size-10 items-center justify-center rounded-xl border border-line">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-5 text-base font-semibold">AI for Patients</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                MyHealth helps patients navigate general health information and
                understand possible next steps. It does not replace professional
                medical advice.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="h-full rounded-2xl border border-line bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="bg-brand-mint text-brand flex size-10 items-center justify-center rounded-xl">
                  <Stethoscope className="size-5" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                  Clinician review required
                </span>
              </div>
              <h3 className="font-display mt-5 text-base font-semibold">
                AI for Clinicians
              </h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                The clinical assistant helps authorized healthcare professionals review
                patient information and prepare draft documentation. Clinicians remain
                responsible for reviewing and approving clinical content.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140}>
          <div className="mt-10 rounded-2xl border border-line bg-brand-mint/30 p-6 sm:p-8">
            <p className="text-ink text-center text-xs font-semibold tracking-[0.16em] uppercase">
              Privacy and access principles
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-xl border border-line/80 bg-white px-3.5 py-2.5"
                >
                  <item.icon className="text-brand size-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-ink-muted mt-6 text-center text-xs leading-relaxed">
              These are product design principles and intended system controls, not
              certifications or compliance claims.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <p className="border-primary/30 bg-primary/[0.04] text-ink mx-auto mt-8 max-w-3xl rounded-xl border px-5 py-4 text-center text-sm">
            AI supports healthcare professionals and patient navigation. It does not
            replace professional medical judgment.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
