import { addMinutesToTime, daysFromNowISO, todayISO } from "@/utils/format";
import type { DoctorAvailability, Weekday } from "@/types";

/**
 * Availability helpers for the booking flow.
 *
 * Only slots that the shared availability service publishes are offered, and
 * a slot that is already booked for that doctor is never shown again.
 */

const WEEKDAYS: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export interface Slot {
  startTime: string;
  endTime: string;
}

export function weekdayOf(isoDate: string): Weekday {
  const date = new Date(`${isoDate}T00:00:00`);
  return WEEKDAYS[date.getDay()] ?? "MONDAY";
}

/** Dates (up to `days` ahead) on which the doctor has active availability. */
export function listAvailableDates(
  availability: DoctorAvailability[],
  days = 30,
): string[] {
  const active = availability.filter((slot) => slot.isActive);
  const dates: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = daysFromNowISO(offset);
    const weekday = weekdayOf(date);
    if (active.some((slot) => slot.dayOfWeek === weekday)) {
      dates.push(date);
    }
  }

  return dates;
}

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Bookable slots for one date, excluding times already taken by a booking. */
export function listSlots(
  availability: DoctorAvailability[],
  bookedStartTimes: string[],
  isoDate: string,
): Slot[] {
  const weekday = weekdayOf(isoDate);
  const isToday = isoDate === todayISO();
  const slots: Slot[] = [];

  availability
    .filter((item) => item.isActive && item.dayOfWeek === weekday)
    .forEach((item) => {
      const duration = item.slotDurationMinutes > 0 ? item.slotDurationMinutes : 30;
      for (
        let start = minutesOf(item.startTime);
        start + duration <= minutesOf(item.endTime);
        start += duration
      ) {
        const startTime = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        if (isToday && start <= nowMinutes()) continue;
        if (bookedStartTimes.includes(startTime)) continue;
        slots.push({ startTime, endTime: addMinutesToTime(startTime, duration) });
      }
    });

  return slots;
}
