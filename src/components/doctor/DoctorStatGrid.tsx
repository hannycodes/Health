import { CalendarCheck, CalendarClock, CalendarDays, FileText, UsersRound } from "lucide-react";

import { StatCard } from "@/components/common/StatCard";

interface DoctorStatGridProps {
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  patientCount: number;
  pendingDocumentationCount: number;
}

/** Dashboard statistics. Every value is derived from the service layer. */
export function DoctorStatGrid({
  todayCount,
  upcomingCount,
  completedCount,
  patientCount,
  pendingDocumentationCount,
}: DoctorStatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Today's appointments"
        value={todayCount}
        icon={CalendarDays}
        hint={todayCount === 0 ? "No visits scheduled" : "Chronological below"}
      />
      <StatCard
        label="Upcoming"
        value={upcomingCount}
        icon={CalendarClock}
        tone="sky"
        hint="Booked, after today"
      />
      <StatCard
        label="Completed consultations"
        value={completedCount}
        icon={CalendarCheck}
        tone="violet"
        hint="Across all appointments"
      />
      <StatCard
        label="Accessible patients"
        value={patientCount}
        icon={UsersRound}
        tone="amber"
        hint="Linked by your care relationships"
      />
      <StatCard
        label="Pending documentation"
        value={pendingDocumentationCount}
        icon={FileText}
        hint="Completed visits without a record"
      />
    </div>
  );
}
