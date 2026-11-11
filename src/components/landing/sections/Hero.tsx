import {
  ArrowRight,
  CalendarCheck,
  FileHeart,
  Link2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DoctorDashboardPreview } from "../DoctorDashboardPreview";
import { GetStartedDialog } from "../GetStartedDialog";
import { PatientDashboardPreview } from "../PatientDashboardPreview";
import { Reveal } from "../Reveal";

function FloatingCard({
  icon: Icon,
  title,
  detail,
  className,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  className: string;
  delay: string;
}) {
  return (
    <div
      className={cn(
        "bg-card/95 animate-float shadow-float absolute hidden items-center gap-2.5 rounded-xl border px-3 py-2 backdrop-blur motion-reduce:animate-none xl:flex",
        className,
      )}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <span className="bg-brand-mint text-brand flex size-7 items-center justify-center rounded-lg">
        <Icon className="size-3.5" />
      </span>
      <span>
        <span className="block text-[11px] font-semibold">{title}</span>
        <span className="text-muted-foreground block text-[10px]">{detail}</span>
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero-glow relative overflow-x-clip pt-14 pb-16 sm:pt-20 sm:pb-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="border-primary/20 bg-white/80 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-xs backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            A smarter way to navigate healthcare
          </span>

          <h1 className="font-display text-ink mt-5 text-4xl leading-[1.08] font-extrabold text-balance sm:text-5xl lg:text-[56px]">
            Your Health Journey. <span className="text-brand">Connected.</span>
          </h1>

          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-[17px]">
            <span className="text-ink font-medium">
              Better connections. Better coordination. Better healthcare experiences.
            </span>{" "}
            MyHealth brings patients, doctors, and hospitals together in one connected
            platform. Discover healthcare services, book appointments, access medical
            history, and get intelligent assistance throughout your healthcare journey.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedDialog
              trigger={
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              }
            />
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="#features">See what you can do</a>
            </Button>
          </div>

          <p className="text-ink-muted mt-5 text-xs">
            One platform for patients, doctors, hospitals, and platform teams.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
          <div
            className="pointer-events-none absolute inset-x-6 top-6 -z-10 h-64 rounded-full bg-brand-mint-strong/70 blur-3xl"
            aria-hidden="true"
          />

          <div className="grid items-start gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <Reveal>
              <PatientDashboardPreview />
            </Reveal>
            <Reveal delay={120} className="lg:mt-10">
              <DoctorDashboardPreview />
            </Reveal>
          </div>

          <FloatingCard
            icon={CalendarCheck}
            title="Appointment confirmed"
            detail="Cardiology · Wed, 09:00"
            className="top-24 -left-10"
            delay="0s"
          />
          <FloatingCard
            icon={Link2}
            title="Hospital connected"
            detail="Addis Care General"
            className="top-10 -right-12"
            delay="1.4s"
          />
          <FloatingCard
            icon={FileHeart}
            title="Medical history available"
            detail="Authorized access only"
            className="bottom-16 -left-6"
            delay="2.2s"
          />
        </div>

        <p className="text-ink-muted mt-6 text-center text-[11px]">
          Illustrative interface previews.
        </p>
      </div>
    </section>
  );
}
