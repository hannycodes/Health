import { useState } from "react";
import { Outlet } from "react-router-dom";

import { MobileNav } from "@/components/navigation/MobileNav";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Topbar } from "@/components/navigation/Topbar";
import type { Role } from "@/types";

/**
 * Shared chrome for every authenticated dashboard: sidebar, top bar, mobile
 * drawer and the routed page content. Role layouts below simply pass a role.
 */
export function DashboardShell({ role }: { role: Role }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-muted/30 flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <MobileNav role={role} open={mobileOpen} onOpenChange={setMobileOpen} />
    </div>
  );
}
