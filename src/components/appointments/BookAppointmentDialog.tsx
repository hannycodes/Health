import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { Textarea } from "@/components/ui/textarea";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { addMinutes } from "@/services/mocks/utils";
import { formatCurrency, todayISO } from "@/utils/format";

const bookingSchema = z.object({
  doctorId: z.string().min(1, "Select a doctor"),
  date: z
    .string()
    .min(1, "Choose a date")
    .refine((value) => value >= todayISO(), "Choose today or a future date"),
  startTime: z.string().min(1, "Choose a start time"),
  reason: z.string().min(10, "Describe the reason in at least 10 characters"),
  paymentMethod: z.enum(["ONLINE", "PAY_AT_HOSPITAL"]),
});

type BookingValues = z.infer<typeof bookingSchema>;

interface BookAppointmentDialogProps {
  patientId: string;
  trigger?: ReactNode;
  onBooked?: () => void;
}

export function BookAppointmentDialog({
  patientId,
  trigger,
  onBooked,
}: BookAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: doctors } = useServiceQuery(
    () => services.doctors.list({ acceptingOnly: true }),
    "booking-doctors",
  );

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      doctorId: "",
      date: "",
      startTime: "09:00",
      reason: "",
      paymentMethod: "ONLINE",
    },
  });

  const selectedDoctor = doctors?.find((doctor) => doctor.id === form.watch("doctorId"));

  async function onSubmit(values: BookingValues) {
    const doctor = doctors?.find((item) => item.id === values.doctorId);
    if (!doctor) {
      toast.error("Please choose a doctor.");
      return;
    }

    setIsSubmitting(true);
    try {
      await services.appointments.create({
        patientId,
        doctorId: doctor.id,
        hospitalId: doctor.hospitalId,
        date: values.date,
        startTime: values.startTime,
        endTime: addMinutes(values.startTime, 30),
        reason: values.reason,
        paymentMethod: values.paymentMethod,
      });
      toast.success("Appointment booked — it is now visible to your doctor.");
      form.reset();
      setOpen(false);
      onBooked?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <CalendarPlus className="size-4" />
            Book appointment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            Choose a doctor and time. The doctor and hospital admin will see the booking
            immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor</Label>
            <Controller
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="doctor" aria-invalid={!!form.formState.errors.doctorId}>
                    <SelectValue placeholder="Select a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doctors ?? []).map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.fullName} — {doctor.specialty} (
                        {formatCurrency(doctor.consultationFee)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.doctorId && (
              <p className="text-destructive text-xs">
                {form.formState.errors.doctorId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                min={todayISO()}
                aria-invalid={!!form.formState.errors.date}
                {...form.register("date")}
              />
              {form.formState.errors.date && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Time</Label>
              <Input
                id="startTime"
                type="time"
                step={900}
                aria-invalid={!!form.formState.errors.startTime}
                {...form.register("startTime")}
              />
              {form.formState.errors.startTime && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.startTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason for visit</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Describe your symptoms or reason for the visit"
              aria-invalid={!!form.formState.errors.reason}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-destructive text-xs">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Payment</Label>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">
                      Pay online
                      {selectedDoctor
                        ? ` — ${formatCurrency(selectedDoctor.consultationFee)}`
                        : ""}
                    </SelectItem>
                    <SelectItem value="PAY_AT_HOSPITAL">Pay at hospital</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-muted-foreground text-xs">
              Payment status is tracked separately from the appointment status.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
