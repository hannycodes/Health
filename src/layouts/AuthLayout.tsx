import { Link, Outlet } from "react-router-dom";

import { Logo } from "@/components/branding/Logo";
import { APP_TAGLINE } from "@/constants";

export function AuthLayout() {
  return (
    <div className="myhealth-surface flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
        <Logo size="md" />
        <nav aria-label="Account navigation" className="flex items-center gap-5 text-sm">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Home
          </Link>
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <Outlet />
        </div>
      </main>

      <footer className="text-muted-foreground px-5 py-6 text-center text-xs sm:px-8">
        {APP_TAGLINE}.
      </footer>
    </div>
  );
}
