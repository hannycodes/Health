import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandMark } from "@/components/common/BrandMark";
import type { Role } from "@/types";
import { SidebarNav } from "./Sidebar";

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
            <BrandMark />
          </SheetTitle>
        </SheetHeader>
        <div className="px-3">
          <SidebarNav role={role} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
