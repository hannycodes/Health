import { HttpError } from "./auth.js";
import { db, nextId } from "./db.js";

export { HttpError };

export const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "General Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
];

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const HOSPITAL_SERVICES = [
  "EMERGENCY",
  "OUTPATIENT",
  "INPATIENT",
  "LABORATORY",
  "IMAGING",
  "PHARMACY",
];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assert(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}

export function getUser(id) {
  return db.users.find((user) => user.id === id);
}

export function getDoctor(id) {
  const user = getUser(id);
  return user && user.role === "DOCTOR" ? user : undefined;
}

export function getHospital(id) {
  return db.hospitals.find((hospital) => hospital.id === id);
}

/**
 * Resolve the hospital a request may touch.
 *
 * A hospital administrator is always pinned to their assigned hospital: an
 * explicit id for another hospital is rejected, not silently ignored.
 */
export function scopedHospitalId(user, requested) {
  if (user.role === "HOSPITAL_ADMIN") {
    if (requested && requested !== user.hospitalId) {
      throw new HttpError(403, "You can only access your own hospital's data.");
    }
    return user.hospitalId;
  }
  return requested || undefined;
}

export function requireHospitalScope(user, hospitalId) {
  if (user.role === "HOSPITAL_ADMIN" && hospitalId !== user.hospitalId) {
    throw new HttpError(403, "You can only access your own hospital's data.");
  }
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function sortAppointments(rows) {
  return [...rows].sort((a, b) =>
    `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
  );
}

export function expandAppointment(appointment) {
  const patient = getUser(appointment.patientId);
  const doctor = getDoctor(appointment.doctorId);
  const hospital = getHospital(appointment.hospitalId);
  const payment = db.payments.find((item) => item.appointmentId === appointment.id);

  return {
    ...appointment,
    patientName: patient?.fullName ?? "Unknown patient",
    doctorName: doctor?.fullName ?? "Unknown doctor",
    doctorSpecialty: doctor?.specialty ?? "General Medicine",
    hospitalName: hospital?.name ?? "Unknown hospital",
    paymentStatus: payment?.status,
    paymentMethod: payment?.method,
  };
}

export function canAccessAppointment(user, appointment) {
  switch (user.role) {
    case "SUPER_ADMIN":
      return true;
    case "PATIENT":
      return appointment.patientId === user.id;
    case "DOCTOR":
      return appointment.doctorId === user.id;
    case "HOSPITAL_ADMIN":
      return appointment.hospitalId === user.hospitalId;
    default:
      return false;
  }
}

export function assertAppointmentAccess(user, appointment) {
  if (!canAccessAppointment(user, appointment)) {
    throw new HttpError(403, "You do not have access to this appointment.");
  }
}

export function pushNotification(input) {
  const notification = {
    id: nextId("ntf"),
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? "SYSTEM",
    isRead: false,
    createdAt: new Date().toISOString(),
    link: input.link,
  };
  db.notifications = [notification, ...db.notifications];
  return notification;
}

export function notifyHospitalAdmins(hospitalId, title, message, link) {
  db.users
    .filter((user) => user.role === "HOSPITAL_ADMIN" && user.hospitalId === hospitalId)
    .forEach((admin) => {
      pushNotification({ userId: admin.id, title, message, type: "SYSTEM", link });
    });
}

export function findPaymentByAppointment(appointmentId) {
  return db.payments.find((payment) => payment.appointmentId === appointmentId);
}
