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
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="size-7">
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:flex sm:flex-col">
            <span className="text-xs leading-tight font-medium">{user.fullName}</span>
            <span className="text-muted-foreground text-[11px] leading-tight">
              {ROLE_LABELS[role]}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
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
