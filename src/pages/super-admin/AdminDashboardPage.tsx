import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";

import { DashboardCard } from "@/components/admin/DashboardCard";
import { PlatformActivityFeed } from "@/components/admin/PlatformActivityFeed";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export function AdminDashboardPage() {
  const { user } = useAuth();

  const summary = useServiceQuery(() => services.analytics.getSummary(), "summary");
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");
  const users = useServiceQuery(() => services.users.list(), "users");
  const logs = useServiceQuery(() => services.auditLogs.list(), "logs");

  const hospitalRows = (hospitals.data ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = hospitalRows.filter(
    (hospital) => hospital.approvalStatus === "PENDING",
  );
  const recentUsers = users.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName === "Super Admin" ? user.fullName : (user?.fullName.split(" ")[0] ?? "Super Admin")}`}
        description={`${longDate} · Platform-wide oversight of hospitals, accounts and activity.`}
        actions={
          <Button asChild>
            <Link to="/admin/hospitals/pending">
              <ShieldCheck className="size-4" />
              Review applications
              {pending.length > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
                  {pending.length}
                </span>
              )}
            </Link>
          </Button>
        }
      />

      {summary.isLoading ? (
        <ListSkeleton rows={2} />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : summary.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total hospitals"
            value={summary.data.totalHospitals}
            icon={Building2}
            hint={`${summary.data.approvedHospitals} approved`}
          />
          <StatCard
            label="Pending approvals"
            value={summary.data.pendingHospitals}
            icon={ShieldCheck}
            tone="amber"
            hint="Awaiting review"
          />
          <StatCard
            label="Registered users"
            value={summary.data.totalUsers}
            icon={Users}
            tone="sky"
            hint={`${summary.data.totalPatients} patients`}
          />
          <StatCard
            label="Total appointments"
            value={summary.data.totalAppointments}
            icon={CalendarDays}
            tone="violet"
            hint={`${summary.data.upcomingAppointments} upcoming`}
          />
          <StatCard
            label="Doctors"
            value={summary.data.totalDoctors}
            icon={Stethoscope}
            hint="Platform-wide"
          />
          <StatCard
            label="Hospital admins"
            value={summary.data.totalAdministrators}
            icon={UserCog}
            tone="sky"
          />
          <StatCard
            label="Suspended hospitals"
            value={summary.data.suspendedHospitals}
            icon={Activity}
            tone="amber"
            hint={`${summary.data.rejectedHospitals} rejected`}
          />
          <StatCard
            label="Completed visits"
            value={summary.data.completedAppointments}
            icon={ClipboardList}
            tone="violet"
            hint={`${summary.data.cancelledAppointments} cancelled`}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <DashboardCard
          title="Recently registered hospitals"
          description="Newest applications and approved partners on MyHealth."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/hospitals">View all</Link>
            </Button>
          }
        >
          {hospitals.isLoading ? (
            <ListSkeleton rows={2} />
          ) : hospitals.error ? (
            <ErrorState message={hospitals.error} onRetry={hospitals.refetch} />
          ) : hospitalRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hospitals registered yet.
            </p>
          ) : (
            <ul className="divide-y">
              {hospitalRows.slice(0, 4).map((hospital) => (
                <li
                  key={hospital.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/hospitals/${hospital.id}`}
                      className="hover:text-primary block truncate text-sm font-medium hover:underline"
                    >
                      {hospital.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {hospital.city} · registered{" "}
                      {formatDate(hospital.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <StatusBadge kind="hospital" value={hospital.approvalStatus} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Pending approvals"
          description="Applications that need a decision."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/hospitals/pending">Review</Link>
            </Button>
          }
        >
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No applications are waiting for review.
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 3).map((hospital) => (
                <li key={hospital.id} className="rounded-lg border p-3">
                  <Link
                    to={`/admin/hospitals/${hospital.id}`}
                    className="hover:text-primary block truncate text-sm font-medium hover:underline"
                  >
                    {hospital.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {hospital.city} · submitted{" "}
                    {formatDate(
                      (hospital.submittedAt ?? hospital.createdAt).slice(0, 10),
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <DashboardCard
          title="Recently registered users"
          description="Patients, doctors and administrators who joined recently."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users">View users</Link>
            </Button>
          }
        >
          {users.isLoading ? (
            <ListSkeleton rows={2} />
          ) : users.error ? (
            <ErrorState message={users.error} onRetry={users.refetch} />
          ) : recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet.</p>
          ) : (
            <ul className="divide-y">
              {recentUsers.slice(0, 5).map((account) => (
                <li
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/users/${account.id}`}
                      className="hover:text-primary block truncate text-sm font-medium hover:underline"
                    >
                      {account.fullName}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {account.email}
                    </p>
                  </div>
                  <StatusBadge kind="account" value={account.status ?? "ACTIVE"} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Platform activity"
          description="Latest administrative actions recorded by the backend."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/activity">Audit log</Link>
            </Button>
          }
        >
          {logs.isLoading ? (
            <ListSkeleton rows={2} />
          ) : logs.error ? (
            <ErrorState message={logs.error} onRetry={logs.refetch} />
          ) : (
            <PlatformActivityFeed logs={logs.data ?? []} limit={5} />
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Quick actions"
        description="Common platform administration tasks."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/hospitals/pending">
              <ShieldCheck className="size-4" />
              Review hospital applications
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/hospitals">
              <Building2 className="size-4" />
              Manage hospitals
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/users">
              <Users className="size-4" />
              View platform users
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/administrators">
              <UserCog className="size-4" />
              Manage administrators
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/analytics">
              <BarChart3 className="size-4" />
              Open analytics
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/admin/activity">
              <Activity className="size-4" />
              Review activity logs
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
          <UsersRound className="size-3.5" />
          Patient clinical records are not exposed in this administration view.
        </p>
      </DashboardCard>
    </div>
  );
}
