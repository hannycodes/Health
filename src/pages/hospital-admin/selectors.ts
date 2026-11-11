import type {
  AppointmentStatus,
  AppointmentWithDetails,
  Department,
  Doctor,
  Patient,
  Payment,
} from "@/types";
import { formatDate, todayISO } from "@/utils/format";

/**
 * Pure derivations for the hospital admin workspace.
 *
 * Everything here is computed from data already fetched through the shared
 * services — no numbers are invented, and no hospital-wide aggregate ever
 * includes a row from another hospital because the caller filters by hospital
 * id at the service boundary.
 */

export interface AppointmentMetrics {
  total: number;
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  booked: number;
}

export function appointmentMetrics(rows: AppointmentWithDetails[]): AppointmentMetrics {
  const today = todayISO();

  return rows.reduce<AppointmentMetrics>(
    (metrics, row) => {
      metrics.total += 1;
      if (row.date === today) metrics.today += 1;
      if (row.status === "BOOKED") metrics.booked += 1;
      if (row.status === "BOOKED" && row.date >= today) metrics.upcoming += 1;
      if (row.status === "COMPLETED") metrics.completed += 1;
      if (row.status === "CANCELLED") metrics.cancelled += 1;
      return metrics;
    },
    { total: 0, today: 0, upcoming: 0, completed: 0, cancelled: 0, booked: 0 },
  );
}

export function countBy<T>(items: T[], keyOf: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function isDoctorActive(doctor: Doctor) {
  return doctor.isActive !== false;
}

export function departmentNameOf(departments: Department[], departmentId?: string) {
  if (!departmentId) return "Unassigned";
  return departments.find((department) => department.id === departmentId)?.name ?? "Unassigned";
}

export function doctorNameOf(doctors: Doctor[], doctorId: string) {
  return doctors.find((doctor) => doctor.id === doctorId)?.fullName ?? "Unknown doctor";
}

/* -------------------------------------------------------------------------- */
/*                            Appointment filtering                           */
/* -------------------------------------------------------------------------- */

export type AppointmentScope = "ALL" | "TODAY" | "UPCOMING" | "COMPLETED" | "CANCELLED";

export interface AppointmentQuery {
  search?: string;
  status?: AppointmentStatus | "ALL";
  scope?: AppointmentScope;
  doctorId?: string;
  departmentId?: string;
  date?: string;
}

export function filterAppointments(
  rows: AppointmentWithDetails[],
  doctors: Doctor[],
  query: AppointmentQuery,
): AppointmentWithDetails[] {
  const today = todayISO();
  const search = query.search?.trim().toLowerCase();
  const departmentOfDoctor = new Map(
    doctors.map((doctor) => [doctor.id, doctor.departmentId]),
  );

  return rows.filter((row) => {
    if (
      search &&
      !`${row.patientName} ${row.doctorName} ${row.id} ${row.reason}`
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }
    if (query.status && query.status !== "ALL" && row.status !== query.status) return false;
    if (query.scope === "TODAY" && row.date !== today) return false;
    if (query.scope === "UPCOMING" && !(row.status === "BOOKED" && row.date >= today)) {
      return false;
    }
    if (query.scope === "COMPLETED" && row.status !== "COMPLETED") return false;
    if (query.scope === "CANCELLED" && row.status !== "CANCELLED") return false;
    if (query.doctorId && query.doctorId !== "ALL" && row.doctorId !== query.doctorId) {
      return false;
    }
    if (
      query.departmentId &&
      query.departmentId !== "ALL" &&
      departmentOfDoctor.get(row.doctorId) !== query.departmentId
    ) {
      return false;
    }
    if (query.date && row.date !== query.date) return false;
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Patients                                  */
/* -------------------------------------------------------------------------- */

export interface PatientRow {
  patient: Patient;
  appointmentCount: number;
  lastVisit?: string;
  upcoming?: string;
  doctorNames: string[];
}

/**
 * Patients are derived from the hospital's own appointments: a hospital admin
 * only ever sees people who actually interacted with their hospital.
 */
export function buildPatientRows(
  appointments: AppointmentWithDetails[],
  patients: Patient[],
): PatientRow[] {
  const today = todayISO();
  const byPatient = new Map<string, AppointmentWithDetails[]>();

  appointments.forEach((row) => {
    byPatient.set(row.patientId, [...(byPatient.get(row.patientId) ?? []), row]);
  });

  return Array.from(byPatient.entries())
    .flatMap<PatientRow>(([patientId, rows]) => {
      const patient = patients.find((item) => item.id === patientId);
      if (!patient) return [];

      const completed = rows
        .filter((row) => row.status === "COMPLETED")
        .sort((a, b) => b.date.localeCompare(a.date));
      const upcoming = rows
        .filter((row) => row.status === "BOOKED" && row.date >= today)
        .sort((a, b) =>
          `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
        );

      return [
        {
          patient,
          appointmentCount: rows.length,
          lastVisit: completed[0]?.date,
          upcoming: upcoming[0]
            ? `${formatDate(upcoming[0].date)} at ${upcoming[0].startTime}`
            : undefined,
          doctorNames: Array.from(new Set(rows.map((row) => row.doctorName))),
        },
      ];
    })
    .sort((a, b) => a.patient.fullName.localeCompare(b.patient.fullName));
}

/* -------------------------------------------------------------------------- */
/*                                  Payments                                  */
/* -------------------------------------------------------------------------- */

export interface PaymentRow {
  payment: Payment;
  appointment?: AppointmentWithDetails;
  appointmentLabel: string;
  patientName: string;
  doctorName: string;
  dateLabel: string;
}

export function buildPaymentRows(
  payments: Payment[],
  appointments: AppointmentWithDetails[],
): PaymentRow[] {
  const appointmentById = new Map(appointments.map((row) => [row.id, row]));

  return payments
    .map<PaymentRow>((payment) => {
      const appointment = appointmentById.get(payment.appointmentId);
      return {
        payment,
        appointment,
        appointmentLabel: appointment
          ? `${appointment.id} · ${formatDate(appointment.date)}`
          : payment.appointmentId,
        patientName: appointment?.patientName ?? "Unknown patient",
        doctorName: appointment?.doctorName ?? "Unknown doctor",
        dateLabel: appointment ? `${formatDate(appointment.date)} ${appointment.startTime}` : "—",
      };
    })
    .sort((a, b) =>
      (b.payment.paidAt ?? b.payment.createdAt).localeCompare(
        a.payment.paidAt ?? a.payment.createdAt,
      ),
    );
}

/**
 * Only a pay-at-hospital record that is still outstanding can be settled by the
 * hospital. Online payments are verified by the payment provider and are never
 * editable here.
 */
export function canSettleAtHospital(payment: Payment) {
  return payment.method === "PAY_AT_HOSPITAL" && payment.status === "UNPAID_AT_HOSPITAL";
}

export interface PaymentSummary {
  paidAmount: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
  failedAmount: number;
  failedCount: number;
  atHospitalAmount: number;
  atHospitalCount: number;
}

export function paymentSummary(payments: Payment[]): PaymentSummary {
  return payments.reduce<PaymentSummary>(
    (summary, payment) => {
      if (payment.status === "PAID") {
        summary.paidAmount += payment.amount;
        summary.paidCount += 1;
      }
      if (payment.status === "PENDING") {
        summary.pendingAmount += payment.amount;
        summary.pendingCount += 1;
      }
      if (payment.status === "FAILED") {
        summary.failedAmount += payment.amount;
        summary.failedCount += 1;
      }
      if (payment.status === "UNPAID_AT_HOSPITAL") {
        summary.atHospitalAmount += payment.amount;
        summary.atHospitalCount += 1;
      }
      return summary;
    },
    {
      paidAmount: 0,
      paidCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      failedAmount: 0,
      failedCount: 0,
      atHospitalAmount: 0,
      atHospitalCount: 0,
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                             Analytics series                               */
/* -------------------------------------------------------------------------- */

export interface SeriesPoint {
  key: string;
  label: string;
  value: number;
}

function localISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Appointment volume per calendar day for the trailing `days` days. */
export function appointmentsByDay(
  rows: AppointmentWithDetails[],
  days: number,
): SeriesPoint[] {
  const anchor = new Date(`${todayISO()}T00:00:00`);
  const points: SeriesPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(anchor);
    date.setDate(date.getDate() - offset);
    const iso = localISO(date);
    points.push({
      key: iso,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      value: rows.filter((row) => row.date === iso).length,
    });
  }

  return points;
}

export function seriesBy(
  rows: AppointmentWithDetails[],
  keyOf: (row: AppointmentWithDetails) => string,
): SeriesPoint[] {
  const counts = countBy(rows, keyOf);
  return Object.entries(counts)
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => b.value - a.value);
}

/* -------------------------------------------------------------------------- */
/*                                  Activity                                  */
/* -------------------------------------------------------------------------- */

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  at: string;
  kind: "appointment" | "doctor" | "department";
}

export function buildHospitalActivity({
  appointments,
  doctors,
  departments,
}: {
  appointments: AppointmentWithDetails[];
  doctors: Doctor[];
  departments: Department[];
}): ActivityItem[] {
  const items: ActivityItem[] = [
    ...appointments.map<ActivityItem>((row) => ({
      id: `apt-${row.id}-${row.status}-${row.updatedAt}`,
      title:
        row.status === "CANCELLED"
          ? "Appointment cancelled"
          : row.status === "COMPLETED"
            ? "Appointment completed"
            : "Appointment booked",
      description: `${row.patientName} · ${row.doctorName} · ${formatDate(row.date)} ${row.startTime}`,
      at: row.updatedAt,
      kind: "appointment",
    })),
    ...doctors.map<ActivityItem>((doctor) => ({
      id: `doc-${doctor.id}`,
      title: "Doctor added",
      description: `${doctor.fullName} · ${doctor.specialty}`,
      at: doctor.createdAt,
      kind: "doctor",
    })),
    ...departments.map<ActivityItem>((department) => ({
      id: `dep-${department.id}`,
      title: "Department created",
      description: `${department.name} · ${department.specialty}`,
      at: department.createdAt,
      kind: "department",
    })),
  ];

  return items
    .filter((item) => !Number.isNaN(new Date(item.at).getTime()))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
}
