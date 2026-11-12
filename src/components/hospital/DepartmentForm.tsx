import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { SPECIALTIES, type Department } from "@/types";

const departmentSchema = z.object({
  name: z.string().min(2, "Enter a department name of at least 2 characters"),
  specialty: z.enum(SPECIALTIES),
  description: z.string().min(20, "Describe the department in at least 20 characters"),
  contactPhone: z.string().max(30, "Phone number is too long").optional(),
  contactEmail: z
    .string()
    .regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address")
    .optional(),
  location: z.string().max(120, "Location is too long").optional(),
});

type DepartmentValues = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  hospitalId: string;
  department?: Department;
  submitLabel?: string;
  onSaved?: (department: Department) => void;
}

export function DepartmentForm({
  hospitalId,
  department,
  submitLabel = "Save department",
  onSaved,
}: DepartmentFormProps) {
  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? "",
      specialty: department?.specialty ?? "General Medicine",
      description: department?.description ?? "",
      contactPhone: department?.contactPhone ?? "",
      contactEmail: department?.contactEmail ?? "",
      location: department?.location ?? "",
    },
  });

  const errors = form.formState.errors;

  async function onSubmit(values: DepartmentValues) {
    const payload = {
      name: values.name.trim(),
      specialty: values.specialty,
      description: values.description.trim(),
      contactPhone: values.contactPhone?.trim() || undefined,
      contactEmail: values.contactEmail?.trim() || undefined,
      location: values.location?.trim() || undefined,
    };

    try {
      const saved = department
        ? await services.departments.update(department.id, payload)
        : await services.departments.create({ ...payload, hospitalId });
      toast.success(department ? "Department updated." : "Department created.");
      if (!department) form.reset();
      onSaved?.(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department-name">Department name</Label>
          <Input
            id="department-name"
            aria-invalid={!!errors.name}
            placeholder="e.g. Cardiology Department"
            {...form.register("name")}
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department-specialty">Specialty</Label>
          <Controller
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="department-specialty">
                  <SelectValue placeholder="Select a specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="department-description">Description</Label>
        <Textarea
          id="department-description"
          rows={3}
          aria-invalid={!!errors.description}
          placeholder="What the department treats and who patients should see"
          {...form.register("description")}
        />
        {errors.description && (
          <p className="text-destructive text-xs">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department-phone">Contact phone</Label>
          <Input
            id="department-phone"
            aria-invalid={!!errors.contactPhone}
            placeholder="+251 ..."
            {...form.register("contactPhone")}
          />
          {errors.contactPhone && (
            <p className="text-destructive text-xs">{errors.contactPhone.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department-email">Contact email</Label>
          <Input
            id="department-email"
            type="email"
            aria-invalid={!!errors.contactEmail}
            placeholder="department@hospital.example"
            {...form.register("contactEmail")}
          />
          {errors.contactEmail && (
            <p className="text-destructive text-xs">{errors.contactEmail.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="department-location">Location inside the hospital</Label>
        <Input
          id="department-location"
          aria-invalid={!!errors.location}
          placeholder="e.g. Second floor, Block B"
          {...form.register("location")}
        />
        {errors.location && (
          <p className="text-destructive text-xs">{errors.location.message}</p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
