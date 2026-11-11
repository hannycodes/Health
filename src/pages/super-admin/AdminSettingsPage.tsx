import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HOSPITAL_TYPE_LABELS } from "@/constants";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { PlatformSettings } from "@/types";
import { formatDateTime } from "@/utils/format";

const settingsSchema = z.object({
  platformName: z.string().min(2, "Enter the platform name"),
  platformDescription: z.string().min(10, "Add a short description"),
  supportEmail: z.string().min(1, "Email is required").email("Enter a valid email"),
  supportPhone: z.string().min(7, "Enter a valid phone number"),
  patientRegistrationEnabled: z.boolean(),
  hospitalRegistrationEnabled: z.boolean(),
  requireHospitalVerificationDocuments: z.boolean(),
  regions: z.string().min(1, "List at least one region"),
  sessionTimeoutMinutes: z
    .number()
    .min(5, "At least 5 minutes")
    .max(1440, "At most 24 hours"),
  requireStrongPasswords: z.boolean(),
  adminSessionNote: z.string().max(400, "Keep this under 400 characters"),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      platformName: settings.platformName,
      platformDescription: settings.platformDescription,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      patientRegistrationEnabled: settings.patientRegistrationEnabled,
      hospitalRegistrationEnabled: settings.hospitalRegistrationEnabled,
      requireHospitalVerificationDocuments:
        settings.requireHospitalVerificationDocuments,
      regions: settings.regions.join(", "),
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      requireStrongPasswords: settings.requireStrongPasswords,
      adminSessionNote: settings.adminSessionNote,
    },
  });

  async function onSubmit(values: SettingsValues) {
    try {
      await services.settings.update({
        platformName: values.platformName.trim(),
        platformDescription: values.platformDescription.trim(),
        supportEmail: values.supportEmail.trim(),
        supportPhone: values.supportPhone.trim(),
        patientRegistrationEnabled: values.patientRegistrationEnabled,
        hospitalRegistrationEnabled: values.hospitalRegistrationEnabled,
        requireHospitalVerificationDocuments:
          values.requireHospitalVerificationDocuments,
        regions: values.regions
          .split(",")
          .map((region) => region.trim())
          .filter(Boolean),
        sessionTimeoutMinutes: values.sessionTimeoutMinutes,
        requireStrongPasswords: values.requireStrongPasswords,
        adminSessionNote: values.adminSessionNote.trim(),
      });
      toast.success("Platform settings saved.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platformName">Platform name</Label>
            <Input id="platformName" {...form.register("platformName")} />
            {form.formState.errors.platformName && (
              <p className="text-destructive text-xs">
                {form.formState.errors.platformName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              {...form.register("supportEmail")}
            />
            {form.formState.errors.supportEmail && (
              <p className="text-destructive text-xs">
                {form.formState.errors.supportEmail.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportPhone">Support phone</Label>
            <Input id="supportPhone" {...form.register("supportPhone")} />
            {form.formState.errors.supportPhone && (
              <p className="text-destructive text-xs">
                {form.formState.errors.supportPhone.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="platformDescription">Platform description</Label>
            <Textarea
              id="platformDescription"
              {...form.register("platformDescription")}
            />
            {form.formState.errors.platformDescription && (
              <p className="text-destructive text-xs">
                {form.formState.errors.platformDescription.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4 rounded border"
              {...form.register("patientRegistrationEnabled")}
            />
            Allow patients to create their own accounts
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4 rounded border"
              {...form.register("hospitalRegistrationEnabled")}
            />
            Allow hospitals to submit registration applications
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4 rounded border"
              {...form.register("requireHospitalVerificationDocuments")}
            />
            Require verification documents before a hospital can be approved
          </label>
          <p className="text-muted-foreground text-xs">
            These switches are stored by the settings service. They do not
            override backend authorization.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="regions">Supported regions</Label>
            <Input
              id="regions"
              {...form.register("regions")}
              placeholder="Addis Ababa, Oromia, Amhara"
            />
            <p className="text-muted-foreground text-xs">
              Separate regions with commas.
            </p>
            {form.formState.errors.regions && (
              <p className="text-destructive text-xs">
                {form.formState.errors.regions.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Supported hospital types</p>
            <div className="flex flex-wrap gap-1.5">
              {settings.hospitalTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {HOSPITAL_TYPE_LABELS[type]}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Hospital types are fixed by the platform data model.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Supported specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {settings.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full max-w-xs space-y-1.5">
            <Label htmlFor="sessionTimeoutMinutes">
              Session timeout (minutes)
            </Label>
            <Input
              id="sessionTimeoutMinutes"
              type="number"
              min={5}
              max={1440}
              {...form.register("sessionTimeoutMinutes", { valueAsNumber: true })}
            />
            {form.formState.errors.sessionTimeoutMinutes && (
              <p className="text-destructive text-xs">
                {form.formState.errors.sessionTimeoutMinutes.message}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4 rounded border"
              {...form.register("requireStrongPasswords")}
            />
            Require strong passwords for new accounts
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="adminSessionNote">Administrative access note</Label>
            <Textarea id="adminSessionNote" {...form.register("adminSessionNote")} />
            {form.formState.errors.adminSessionNote && (
              <p className="text-destructive text-xs">
                {form.formState.errors.adminSessionNote.message}
              </p>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Session policy shown here mirrors the backend configuration; changing it
            does not replace server-side session enforcement.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save className="size-4" />
          {form.formState.isSubmitting ? "Saving…" : "Save settings"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Last updated {formatDateTime(settings.updatedAt)}
          {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}
        </p>
      </div>
    </form>
  );
}

export function AdminSettingsPage() {
  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.settings.get(),
    "platform-settings",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Platform-wide configuration supported by the backend. Settings never replace server-side authorization."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Settings" },
        ]}
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <SettingsForm settings={data} key={data.updatedAt} />
      ) : null}
    </div>
  );
}
