import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROLE_HOME } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { GetStartedDialog } from "./GetStartedDialog";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "For Patients", href: "#for-patients" },
  { label: "For Hospitals", href: "#for-hospitals" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-line/80 border-b bg-white/85 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Logo size="sm" />

        <nav
          aria-label="Landing page sections"
          className="hidden items-center gap-0.5 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-ink-muted hover:text-ink rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && role ? (
            <Button size="sm" asChild>
              <Link to={ROLE_HOME[role]}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <GetStartedDialog trigger={<Button size="sm">Get Started</Button>} />
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="bg-white">
          <SheetHeader>
            <SheetTitle className="text-left">
              <Logo size="sm" to={null} />
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 px-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="hover:bg-brand-mint rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="border-line mt-2 border-t pt-3">
              {isAuthenticated && role ? (
                <Button className="w-full" asChild>
                  <Link to={ROLE_HOME[role]}>Go to dashboard</Link>
                </Button>
              ) : (
                <Button className="w-full" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
