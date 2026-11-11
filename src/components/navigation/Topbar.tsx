import { Menu } from "lucide-react";

import { BrandMark } from "@/components/common/BrandMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
          onClick={onOpenMobileNav}
        >
          <Menu className="size-5" />
        </Button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex">
          Demo mode
        </Badge>
        {user && <NotificationsMenu userId={user.id} />}
        <UserMenu />
      </div>
    </header>
  );
}
