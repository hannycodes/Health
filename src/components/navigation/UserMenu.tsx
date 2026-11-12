import { useNavigate } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import { getInitials } from "@/utils/format";

const PROFILE_PATH: Record<Role, string> = {
  PATIENT: "/patient/profile",
  DOCTOR: "/doctor/profile",
  HOSPITAL_ADMIN: "/hospital-admin/profile",
  SUPER_ADMIN: "/super-admin",
};

/** Account menu. The trigger shows initials only. */
export function UserMenu() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || !role) return null;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`Account menu for ${user.fullName}`}
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{ROLE_LABELS[role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(PROFILE_PATH[role])}>
          <UserRound className="size-4" />
          My profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleLogout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
