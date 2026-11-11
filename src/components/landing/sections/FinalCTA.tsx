import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GetStartedDialog } from "../GetStartedDialog";
import { Reveal } from "../Reveal";

export function FinalCTA() {
  return (
    <section className="bg-surface-dark dark-glow relative overflow-hidden py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <h2 className="font-display text-3xl leading-[1.12] font-bold text-balance text-white sm:text-4xl">
            A More Connected Healthcare Experience Starts Here.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Whether you're seeking care or delivering it, MyHealth helps bring the
            healthcare journey together.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedDialog
              trigger={
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              }
            />
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              asChild
            >
              <a href="#features">Explore MyHealth</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
