import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AdministratorTable } from "@/components/admin/AdministratorTable";
import { ReasonDialog } from "@/components/admin/ReasonDialog";
import { TablePagination } from "@/components/admin/TablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_STATUS_META } from "@/constants";
import { usePagination } from "@/hooks/usePagination";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  type HospitalAdminWithHospital,
} from "@/types";

type StatusFilter = "ALL" | AccountStatus;

const inviteSchema = z.object({
  fullName: z.string().min(3, "Enter the administrator's full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().optional(),
  hospitalId: z.string().min(1, "Choose an approved hospital"),
});

type InviteValues = z.infer<typeof inviteSchema>;

export function AdministratorsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [credentials, setCredentials] = useState<{
    fullName: string;
    email: string;
    password?: string;
  } | null>(null);
  const [reassignTarget, setReassignTarget] =
    useState<HospitalAdminWithHospital | null>(null);
  const [reassignHospitalId, setReassignHospitalId] = useState("");

  const adminsQuery = useServiceQuery(
    () =>
      services.administrators.list({
        search,
        status: status === "ALL" ? undefined : status,
      }),
    `${search}:${status}`,
  );
  const hospitalsQuery = useServiceQuery(
    () => services.hospitals.list({ approvalStatus: "APPROVED" }),
    "approved-hospitals",
  );

  const administrators = adminsQuery.data ?? [];
  const hospitals = hospitalsQuery.data ?? [];
  const pagination = usePagination(administrators, 8);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { fullName: "", email: "", phone: "", hospitalId: "" },
  });

  async function invite(values: InviteValues) {
    try {
      const result = await services.administrators.invite({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        hospitalId: values.hospitalId,
      });
      setInviteOpen(false);
      form.reset();
      setCredentials({
        fullName: result.administrator.fullName,
        email: result.administrator.email,
        password: result.temporaryPassword,
      });
      toast.success("Administrator invited.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function reassign() {
    if (!reassignTarget || !reassignHospitalId) return;
    try {
      await services.administrators.reassign(
        reassignTarget.id,
        reassignHospitalId,
      );
      toast.success("Administrator reassigned.");
      setReassignTarget(null);
      setReassignHospitalId("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital administrators"
        description="Administrators are always assigned to an approved hospital. Invitations and reassignments are audited."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Administrators" },
        ]}
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button disabled={hospitals.length === 0}>
                <UserPlus className="size-4" />
                Invite administrator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a hospital administrator</DialogTitle>
                <DialogDescription>
                  The administrator is created in a pending state until their
                  onboarding is complete. Only approved hospitals can be selected.
                </DialogDescription>
              </DialogHeader>

              <form
                id="invite-administrator"
                onSubmit={form.handleSubmit(invite)}
                className="space-y-3"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    aria-invalid={!!form.formState.errors.fullName}
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    aria-invalid={!!form.formState.errors.email}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-phone">Phone (optional)</Label>
                  <Input id="invite-phone" type="tel" {...form.register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-hospital">Assigned hospital</Label>
                  <Select
                    value={form.watch("hospitalId")}
                    onValueChange={(value) =>
                      form.setValue("hospitalId", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="invite-hospital">
                      <SelectValue placeholder="Choose an approved hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.hospitalId && (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.hospitalId.message}
                    </p>
                  )}
                </div>
              </form>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  type="submit"
                  form="invite-administrator"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Inviting…" : "Send invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or hospital"
          ariaLabel="Search administrators"
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger className="w-44" aria-label="Filter by account status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ACCOUNT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {ACCOUNT_STATUS_META[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hospitals.length === 0 && !hospitalsQuery.isLoading && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          No approved hospitals exist yet, so new administrators cannot be assigned.
          Approve a hospital first.
        </p>
      )}

      {adminsQuery.isLoading ? (
        <ListSkeleton rows={4} />
      ) : adminsQuery.error ? (
        <ErrorState message={adminsQuery.error} onRetry={adminsQuery.refetch} />
      ) : administrators.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No administrators match these filters"
          description="Invite an administrator or adjust the filters."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {administrators.length} administrator
              {administrators.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AdministratorTable
              administrators={pagination.pageRows}
              actions={(admin) => (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReassignTarget(admin);
                      setReassignHospitalId(admin.hospitalId);
                    }}
                  >
                    Reassign
                  </Button>

                  {(admin.status ?? "ACTIVE") === "ACTIVE" && (
                    <>
                      <ReasonDialog
                        title="Suspend this administrator?"
                        description={`${admin.fullName} will be blocked from signing in. Their audit history is retained.`}
                        confirmLabel="Suspend"
                        destructive
                        requiresReason
                        trigger={
                          <Button size="sm" variant="destructive">
                            Suspend
                          </Button>
                        }
                        onConfirm={async (reason) => {
                          await services.administrators.setStatus(
                            admin.id,
                            "SUSPENDED",
                            reason,
                          );
                          toast.success("Administrator suspended.");
                        }}
                      />
                    </>
                  )}

                  {(admin.status ?? "ACTIVE") === "PENDING" && (
                    <ReasonDialog
                      title="Activate this administrator?"
                      description={`${admin.fullName} will be able to sign in to ${admin.hospitalName}.`}
                      confirmLabel="Activate"
                      trigger={<Button size="sm">Activate</Button>}
                      onConfirm={async () => {
                        await services.administrators.setStatus(
                          admin.id,
                          "ACTIVE",
                        );
                        toast.success("Administrator activated.");
                      }}
                    />
                  )}

                  {((admin.status ?? "ACTIVE") === "SUSPENDED" ||
                    (admin.status ?? "ACTIVE") === "DISABLED") && (
                    <ReasonDialog
                      title="Reactivate this administrator?"
                      description={`${admin.fullName} will regain access to ${admin.hospitalName}.`}
                      confirmLabel="Reactivate"
                      trigger={<Button size="sm">Reactivate</Button>}
                      onConfirm={async () => {
                        await services.administrators.setStatus(
                          admin.id,
                          "ACTIVE",
                        );
                        toast.success("Administrator reactivated.");
                      }}
                    />
                  )}
                </>
              )}
            />
            <TablePagination
              total={pagination.total}
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Temporary credentials are mock-only: a real backend e-mails an invite. */}
      <Dialog
        open={Boolean(credentials)}
        onOpenChange={(open) => !open && setCredentials(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation created</DialogTitle>
            <DialogDescription>
              Share these credentials with {credentials?.fullName} through a secure
              channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>
              <span className="text-muted-foreground text-xs uppercase">Email</span>
              <br />
              {credentials?.email}
            </p>
            {credentials?.password && (
              <p>
                <span className="text-muted-foreground text-xs uppercase">
                  Temporary password
                </span>
                <br />
                <span className="font-mono">{credentials.password}</span>
              </p>
            )}
            <Badge variant="outline">Demo only — no email is sent</Badge>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reassignTarget)}
        onOpenChange={(open) => !open && setReassignTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign administrator</DialogTitle>
            <DialogDescription>
              {reassignTarget?.fullName} will move from{" "}
              {reassignTarget?.hospitalName} to the selected approved hospital. The
              change is audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reassign-hospital">Approved hospital</Label>
            <Select value={reassignHospitalId} onValueChange={setReassignHospitalId}>
              <SelectTrigger id="reassign-hospital">
                <SelectValue placeholder="Choose a hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => void reassign()}
              disabled={!reassignHospitalId}
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
