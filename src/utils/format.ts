/** Currency, date and text formatting helpers shared by all dashboards. */

export function formatCurrency(amount: number, currency: string = "ETB") {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} – ${endTime}`;
}

/** Add minutes to a `HH:mm` string, returning `HH:mm` (wraps within a day). */
export function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const next = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

/** Friendly greeting for the current local time. */
export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Today in `YYYY-MM-DD` using the local calendar. */
export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function daysFromNowISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
