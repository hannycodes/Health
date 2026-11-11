import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE } from "./navConfig";

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
  className?: string;
}

/** Navigation list shared by the desktop sidebar and mobile drawer. */
export function SidebarNav({ role, onNavigate, className }: SidebarProps) {
  const items = NAV_BY_ROLE[role];

  return (
    <nav aria-label="Main navigation" className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )
          }
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Shared sign-out action, used by the sidebar footer and the mobile drawer. */
export function SignOutButton({
  onSignedOut,
  className,
}: {
  onSignedOut?: () => void;
  className?: string;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    onSignedOut?.();
    navigate("/login", { replace: true });
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground w-full justify-start gap-3",
        className,
      )}
      onClick={() => void handleSignOut()}
    >
      <LogOut className="size-4" aria-hidden="true" />
      Sign out
    </Button>
  );
}

export function Sidebar({ role, onNavigate, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "bg-sidebar border-sidebar-border hidden w-64 shrink-0 flex-col border-r lg:flex",
        className,
      )}
    >
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Logo size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav role={role} onNavigate={onNavigate} />
      </div>

      <div className="border-sidebar-border border-t px-3 py-3">
        <SignOutButton onSignedOut={onNavigate} />
      </div>
    </aside>
  );
}
