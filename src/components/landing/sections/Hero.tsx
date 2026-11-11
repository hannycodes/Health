import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GetStartedDialog } from "../GetStartedDialog";
import { Reveal } from "../Reveal";

export function Hero() {
  return (
    <section className="hero-glow relative overflow-x-clip pt-16 pb-20 sm:pt-24 sm:pb-28">
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
            MyHealth brings patients, doctors, and hospitals together in one
            connected platform. Discover healthcare services, book appointments,
            access medical history, and get intelligent assistance throughout your
            healthcare journey.
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
      </div>
    </section>
  );
}
