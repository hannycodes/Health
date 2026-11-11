import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { AIAndTrust } from "@/components/landing/sections/AIAndTrust";
import { Features } from "@/components/landing/sections/Features";
import { FinalCTA } from "@/components/landing/sections/FinalCTA";
import { Hero } from "@/components/landing/sections/Hero";
import { Problem } from "@/components/landing/sections/Problem";
import { Solution } from "@/components/landing/sections/Solution";

/**
 * Public landing page.
 *
 * Accessible without authentication; every call to action routes into the
 * existing sign-in flow rather than a second registration system.
 */
export function LandingPage() {
  return (
    <div id="top" className="bg-background min-h-screen scroll-mt-20">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <AIAndTrust />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
