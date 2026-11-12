import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/branding/Logo";
import type { Role } from "@/types";
import { SidebarNav, SignOutButton } from "./Sidebar";

interface MobileNavProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ role, open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="bg-sidebar w-72">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-left">
            <Logo size="sm" to={null} />
          </SheetTitle>
        </SheetHeader>
        <div className="px-3">
          <SidebarNav role={role} onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="border-sidebar-border mt-auto border-t px-3 py-3">
          <SignOutButton onSignedOut={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
