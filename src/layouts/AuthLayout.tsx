import { Outlet } from "react-router-dom";

import { Logo } from "@/components/branding/Logo";
import { APP_TAGLINE } from "@/constants";

export function AuthLayout() {
  return (
    <div className="myhealth-surface flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Logo size="md" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="text-muted-foreground px-5 py-6 text-center text-xs sm:px-8">
        {APP_TAGLINE}.
      </footer>
    </div>
  );
}
