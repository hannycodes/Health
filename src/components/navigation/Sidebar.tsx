import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import { getInitials } from "@/utils/format";
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
  const { user } = useAuth();

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
        <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
          {ROLE_LABELS[role]} workspace
        </p>
        <SidebarNav role={role} onNavigate={onNavigate} />
      </div>

      <div className="border-sidebar-border border-t px-3 py-3">
        {user && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {getInitials(user.fullName)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {user.fullName}
            </span>
          </div>
        )}
        <SignOutButton onSignedOut={onNavigate} />
      </div>
    </aside>
  );
}
