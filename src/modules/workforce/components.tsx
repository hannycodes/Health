import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/branding/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";

import {
  employerById,
  fullName,
  initialsOf,
  logoutProfessional,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsFor,
  salaryLabel,
  toggleSavedOpportunity,
  unreadNotificationCount,
  useWorkforce,
} from "./store";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONE,
  EMPLOYMENT_TYPE_LABELS,
  type ApplicationStatus,
  type Opportunity,
  type Professional,
  type WorkforceNotification,
} from "./types";

const STATUS_TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export function ApplicationStatusPill({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONES[APPLICATION_STATUS_TONE[status]],
        className,
      )}
    >
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  );
}

export function VerificationBadge({ professional }: { professional: Professional }) {
  if (professional.verificationStatus === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <Check className="size-3" aria-hidden="true" />
        Credentials verified
      </span>
    );
  }
  if (professional.verificationStatus === "REJECTED") {
    return (
      <span className="border-destructive/30 bg-destructive/10 text-destructive inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
        Credentials need attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      Verification in review
    </span>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", to: "/workforce/dashboard", icon: LayoutDashboard, end: true },
  { label: "Opportunities", to: "/workforce/opportunities", icon: BriefcaseBusiness },
  { label: "Applications", to: "/workforce/applications", icon: ClipboardList },
  { label: "Professional profile", to: "/workforce/profile", icon: UserRound },
  { label: "Notifications", to: "/workforce/notifications", icon: Bell },
];

export function WorkforceNotificationsMenu({ professionalId }: { professionalId: string }) {
  const navigate = useNavigate();
  const notifications = notificationsFor(professionalId).slice(0, 5);
  const unread = unreadNotificationCount(professionalId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-primary text-xs font-medium hover:underline"
              onClick={() => markAllNotificationsRead(professionalId)}
            >
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            You have no notifications yet.
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-1 py-2.5"
              onClick={() => {
                markNotificationRead(notification.id);
                navigate(
                  notification.opportunityId
                    ? `/workforce/opportunities/${notification.opportunityId}`
                    : "/workforce/notifications",
                );
              }}
            >
              <span className="flex w-full items-start gap-2">
                {!notification.isRead && (
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                )}
                <span className="flex-1">
                  <span className="block text-xs font-medium">{notification.title}</span>
                  <span className="text-muted-foreground line-clamp-2 block text-xs">
                    {notification.message}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-[11px]">
                    {formatDateTime(notification.createdAt)}
                  </span>
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/workforce/notifications")}>
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkforceSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Logo size="sm" to="/workforce" />
      </div>
      <nav aria-label="Workforce navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <p className="text-muted-foreground mb-1 px-3 text-[11px] font-semibold tracking-wider uppercase">
          MyHealth Workforce
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )
            }
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
            MyHealth
          </p>
          <Link
            to="/patient"
            onClick={onNavigate}
            className="text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            <CalendarCheck2 className="size-4" aria-hidden="true" />
            Patient care
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function WorkforceShell() {
  const { professional } = useWorkforce();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!professional) return null;

  function signOut() {
    logoutProfessional();
    navigate("/workforce/login", { replace: true });
  }

  return (
    <div className="bg-muted/30 flex min-h-screen">
      <aside className="bg-sidebar border-sidebar-border hidden w-64 shrink-0 flex-col border-r lg:flex">
        <WorkforceSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="lg:hidden">
              <Logo size="xs" to="/workforce" />
            </div>
            <Link
              to="/workforce/opportunities"
              className="text-muted-foreground hover:text-foreground hidden items-center gap-2 text-sm sm:flex"
            >
              <Search className="size-4" />
              Explore opportunities
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <WorkforceNotificationsMenu professionalId={professional.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <span className="bg-secondary text-secondary-foreground flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
                    {initialsOf(professional)}
                  </span>
                  <span className="hidden text-left sm:flex sm:flex-col">
                    <span className="text-xs leading-tight font-medium">
                      {fullName(professional)}
                    </span>
                    <span className="text-muted-foreground text-[11px] leading-tight">
                      {professional.specialty || "Healthcare professional"}
                    </span>
                  </span>
                  <ChevronDown className="text-muted-foreground hidden size-3.5 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{fullName(professional)}</p>
                  <p className="text-muted-foreground truncate text-xs">{professional.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/workforce/profile")}>
                  <UserRound className="size-4" />
                  Professional profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar w-72 p-0">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-left">
              <Logo size="sm" to={null} />
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1">
            <WorkforceSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function WorkforcePublicHeader() {
  return (
    <header className="bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo size="sm" to="/workforce" />
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm lg:flex">
          <Link to="/workforce" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/workforce/opportunities" className="hover:text-foreground transition-colors">
            Find Opportunities
          </Link>
          <a href="#for-hospitals" className="hover:text-foreground transition-colors">
            For Hospitals
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/workforce/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/workforce/register">Join MyHealth Workforce</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function OpportunityCard({
  opportunity,
  compact = false,
  showSave = true,
  professional,
}: {
  opportunity: Opportunity;
  compact?: boolean;
  showSave?: boolean;
  professional?: Professional | null;
}) {
  const employer = employerById(opportunity.employerId);
  const saved = professional?.savedOpportunityIds.includes(opportunity.id) ?? false;

  return (
    <div className="bg-card hover:border-primary/30 group flex h-full flex-col gap-4 rounded-xl border p-5 shadow-[var(--shadow-card)] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="bg-brand-mint text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
            {employer?.initials ?? "MH"}
          </span>
          <div className="space-y-0.5">
            <Link
              to={`/workforce/opportunities/${opportunity.id}`}
              className="group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors"
            >
              {opportunity.title}
            </Link>
            <p className="text-muted-foreground line-clamp-1 text-xs">{employer?.name}</p>
          </div>
        </div>
        {showSave && professional && (
          <SaveButton opportunity={opportunity} saved={saved} professionalId={professional.id} />
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden="true" />
          {opportunity.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5" aria-hidden="true" />
          {opportunity.department}
        </span>
        <span className="inline-flex items-center gap-1">
          <Wallet className="size-3.5" aria-hidden="true" />
          {salaryLabel(opportunity)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[opportunity.employmentType]}</Badge>
        {opportunity.isShift && <Badge variant="outline">Shift work</Badge>}
        <Badge variant="outline">{opportunity.specialty}</Badge>
        <Badge variant="outline">
          {opportunity.minYears}+ years
        </Badge>
      </div>

      {!compact && (
        <p className="text-muted-foreground line-clamp-2 text-sm">{opportunity.description}</p>
      )}

      <div className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
        <span>Closes {opportunity.applicationDeadline}</span>
        <span>
          {opportunity.vacancies} {opportunity.vacancies === 1 ? "position" : "positions"}
        </span>
      </div>
    </div>
  );
}

function SaveButton({
  opportunity,
  saved,
  professionalId,
}: {
  opportunity: Opportunity;
  saved: boolean;
  professionalId: string;
}) {
  return (
    <button
      type="button"
      aria-label={saved ? "Remove saved opportunity" : "Save opportunity"}
      aria-pressed={saved}
      onClick={() => toggleSavedOpportunity(professionalId, opportunity.id)}
      className={cn(
        "rounded-md border p-1.5 transition-colors",
        saved
          ? "border-primary/30 bg-brand-mint text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4.2L5 20.5v-16a1 1 0 0 1 1-1Z" />
      </svg>
    </button>
  );
}

export function WorkforceEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="bg-brand-mint text-primary flex size-11 items-center justify-center rounded-full">
        <BriefcaseBusiness className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function NotificationList({
  notifications,
  onOpen,
}: {
  notifications: WorkforceNotification[];
  onOpen?: (notification: WorkforceNotification) => void;
}) {
  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => onOpen?.(notification)}
          className={cn(
            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
            !notification.isRead && "bg-brand-mint/40",
          )}
        >
          <span className="bg-secondary text-secondary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
            <Bell className="size-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{notification.title}</span>
            <span className="text-muted-foreground block text-sm">
              {notification.message}
            </span>
            <span className="text-muted-foreground mt-1 block text-xs">
              {formatDateTime(notification.createdAt)}
            </span>
          </span>
          {!notification.isRead && (
            <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-label="Unread" />
          )}
        </button>
      ))}
    </div>
  );
}
