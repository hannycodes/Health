import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { Patient } from "@/types";

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(7, "Enter a valid phone number"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodType: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

function ProfileForm({ patient }: { patient: Patient }) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: patient.fullName,
      phone: patient.phone ?? "",
      dateOfBirth: patient.dateOfBirth ?? "",
      gender: patient.gender,
      bloodType: patient.bloodType ?? "",
      address: patient.address ?? "",
      emergencyContact: patient.emergencyContact ?? "",
    },
  });

  async function onSubmit(values: ProfileValues) {
    try {
      await services.patients.update(patient.id, {
        fullName: values.fullName,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender,
        bloodType: values.bloodType || undefined,
        address: values.address || undefined,
        emergencyContact: values.emergencyContact || undefined,
      });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={patient.email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloodType">Blood type</Label>
              <Input id="bloodType" placeholder="e.g. O+" {...form.register("bloodType")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergencyContact">Emergency contact</Label>
            <Input
              id="emergencyContact"
              placeholder="Name and phone number"
              {...form.register("emergencyContact")}
            />
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PatientProfile() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.patients.getByUserId(user?.id ?? ""),
    user?.id ?? "",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Keep your contact details and medical basics up to date."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Profile" }]}
      />

      {isLoading ? (
        <ListSkeleton rows={1} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <ProfileForm patient={data} key={data.id} />
      ) : (
        <ErrorState title="Profile unavailable" message="No patient profile was found." />
      )}
    </div>
  );
}
