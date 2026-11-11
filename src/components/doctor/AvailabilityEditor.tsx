import { useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
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
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { DoctorAvailability, Weekday } from "@/types";

const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABEL: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

interface AvailabilityEditorProps {
  doctorId: string;
  hospitalId: string;
  slots: DoctorAvailability[];
  onChanged: () => void;
}

/**
 * Weekly availability editor backed by `doctorService.saveAvailability`.
 *
 * The shared model stores weekday, start/end and slot length; break periods and
 * blackout dates do not exist in it yet, so they are not faked here.
 */
export function AvailabilityEditor({
  doctorId,
  hospitalId,
  slots,
  onChanged,
}: AvailabilityEditorProps) {
  const [dayOfWeek, setDayOfWeek] = useState<Weekday>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("16:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  async function addSlot() {
    if (startTime >= endTime) {
      toast.error("The end time must be after the start time.");
      return;
    }

    setIsSaving(true);
    try {
      await services.doctors.saveAvailability({
        doctorId,
        hospitalId,
        dayOfWeek,
        startTime,
        endTime,
        slotDurationMinutes,
        isActive: true,
      });
      toast.success(`${DAY_LABEL[dayOfWeek]} availability saved.`);
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateSlot(slot: DoctorAvailability, patch: Partial<DoctorAvailability>) {
    try {
      await services.doctors.saveAvailability({ ...slot, ...patch });
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function removeSlot(slot: DoctorAvailability) {
    try {
      await services.doctors.removeAvailability(slot.id);
      toast.success("Availability slot removed.");
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="text-primary size-4" aria-hidden="true" />
            Add a weekly slot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="dayOfWeek">Day</Label>
              <Select value={dayOfWeek} onValueChange={(value) => setDayOfWeek(value as Weekday)}>
                <SelectTrigger id="dayOfWeek">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {DAY_LABEL[day]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slotDuration">Slot length (minutes)</Label>
              <Input
                id="slotDuration"
                type="number"
                min={10}
                max={120}
                step={5}
                value={slotDurationMinutes}
                onChange={(event) => setSlotDurationMinutes(Number(event.target.value))}
              />
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={() => void addSlot()} disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Save slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {slots.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No weekly availability yet"
          description="Add the days and hours patients can book. Changes apply to the patient booking flow immediately."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {WEEKDAYS.map((day) => {
            const daySlots = slots.filter((slot) => slot.dayOfWeek === day);
            if (daySlots.length === 0) return null;

            return (
              <Card key={day}>
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center justify-between text-sm">
                    {DAY_LABEL[day]}
                    <Badge variant="outline">{daySlots.length} slot(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium tabular-nums">
                          {slot.startTime} – {slot.endTime}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant={slot.isActive ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => void updateSlot(slot, { isActive: !slot.isActive })}
                          >
                            {slot.isActive ? "Active" : "Paused"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${DAY_LABEL[day]} slot`}
                            onClick={() => void removeSlot(slot)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {slot.slotDurationMinutes}-minute appointments
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Input
                          type="time"
                          aria-label="Slot start time"
                          defaultValue={slot.startTime}
                          onBlur={(event) => {
                            if (event.target.value !== slot.startTime) {
                              void updateSlot(slot, { startTime: event.target.value });
                            }
                          }}
                        />
                        <Input
                          type="time"
                          aria-label="Slot end time"
                          defaultValue={slot.endTime}
                          onBlur={(event) => {
                            if (event.target.value !== slot.endTime) {
                              void updateSlot(slot, { endTime: event.target.value });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Break periods and specific unavailable dates are not supported by the shared
        availability model yet. Only weekly hours and slot length are saved.
      </p>
    </div>
  );
}
