import { NavLink } from "react-router-dom";

import { Logo } from "@/components/branding/Logo";
import { ROLE_LABELS } from "@/constants";
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
        <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
          {ROLE_LABELS[role]} workspace
        </p>
        <SidebarNav role={role} onNavigate={onNavigate} />
      </div>

      <div className="border-sidebar-border border-t px-5 py-4">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Demo environment — data is stored in this browser only.
        </p>
      </div>
    </aside>
  );
}
