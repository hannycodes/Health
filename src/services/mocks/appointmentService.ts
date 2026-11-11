import { ApiError } from "@/lib/http";
import type {
  Appointment,
  AppointmentFilter,
  AppointmentStatus,
  AppointmentWithDetails,
  CreateAppointmentInput,
  Doctor,
  Payment,
} from "@/types";
import type { AppointmentService } from "@/services/interfaces";
import { pushNotification } from "./notifications";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

function matches(appointment: Appointment, filter?: AppointmentFilter) {
  if (!filter) return true;
  if (filter.patientId && appointment.patientId !== filter.patientId) return false;
  if (filter.doctorId && appointment.doctorId !== filter.doctorId) return false;
  if (filter.hospitalId && appointment.hospitalId !== filter.hospitalId) return false;
  if (filter.status && appointment.status !== filter.status) return false;
  if (filter.date && appointment.date !== filter.date) return false;
  return true;
}

function sortAppointments(a: Appointment, b: Appointment) {
  const left = `${a.date}T${a.startTime}`;
  const right = `${b.date}T${b.startTime}`;
  return left.localeCompare(right);
}

function findAppointment(id: string): Appointment {
  const appointment = demoDb.get().appointments.find((item) => item.id === id);
  if (!appointment) {
    throw new ApiError({ status: 404, message: "Appointment not found." });
  }
  return appointment;
}

function updateAppointment(
  id: string,
  mutate: (appointment: Appointment) => void,
): Appointment {
  let updated: Appointment | undefined;

  demoDb.mutate((db) => {
    const appointment = db.appointments.find((item) => item.id === id);
    if (!appointment) {
      throw new ApiError({ status: 404, message: "Appointment not found." });
    }
    mutate(appointment);
    appointment.updatedAt = new Date().toISOString();
    updated = { ...appointment };
  });

  return updated as Appointment;
}

/**
 * THE shared appointment service.
 *
 * Patient, doctor and hospital-admin dashboards all resolve this exact
 * implementation through `src/services/index.ts`, and it writes to the one
 * localStorage-backed store. A booking made by a patient therefore appears
 * immediately on the doctor and hospital-admin screens.
 */
export class MockAppointmentService implements AppointmentService {
  list(filter?: AppointmentFilter): Promise<Appointment[]> {
    return respond(() =>
      demoDb
        .get()
        .appointments.filter((appointment) => matches(appointment, filter))
        .sort(sortAppointments)
        .map((appointment) => ({ ...appointment })),
    );
  }

  listDetailed(filter?: AppointmentFilter): Promise<AppointmentWithDetails[]> {
    return respond(() => {
      const db = demoDb.get();

      return db.appointments
        .filter((appointment) => matches(appointment, filter))
        .sort(sortAppointments)
        .map((appointment) => {
          const patient = db.patients.find((item) => item.id === appointment.patientId);
          const doctor = db.doctors.find((item) => item.id === appointment.doctorId);
          const hospital = db.hospitals.find((item) => item.id === appointment.hospitalId);
          const payment = db.payments.find(
            (item) => item.appointmentId === appointment.id,
          );

          return {
            ...appointment,
            patientName: patient?.fullName ?? "Unknown patient",
            doctorName: doctor?.fullName ?? "Unknown doctor",
            doctorSpecialty: doctor?.specialty ?? "General Medicine",
            hospitalName: hospital?.name ?? "Unknown hospital",
            paymentStatus: payment?.status,
            paymentMethod: payment?.method,
          } satisfies AppointmentWithDetails;
        });
    });
  }

  getById(id: string): Promise<Appointment | null> {
    return respond(() => {
      const appointment = demoDb.get().appointments.find((item) => item.id === id);
      return appointment ? { ...appointment } : null;
    });
  }

  create(input: CreateAppointmentInput): Promise<Appointment> {
    return respond(() => {
      const db = demoDb.get();
      const patient = db.patients.find((item) => item.id === input.patientId);
      const doctor = db.doctors.find((item) => item.id === input.doctorId);
      const hospital = db.hospitals.find((item) => item.id === input.hospitalId);

      if (!patient) {
        throw new ApiError({ status: 404, message: "Patient profile not found." });
      }
      if (!doctor) {
        throw new ApiError({ status: 404, message: "Doctor not found." });
      }
      if (!hospital) {
        throw new ApiError({ status: 404, message: "Hospital not found." });
      }
      if (hospital.approvalStatus !== "APPROVED") {
        throw new ApiError({
          status: 409,
          message: "This hospital is not yet approved to accept appointments.",
        });
      }

      const conflict = db.appointments.some(
        (appointment) =>
          appointment.doctorId === input.doctorId &&
          appointment.date === input.date &&
          appointment.startTime === input.startTime &&
          appointment.status !== "CANCELLED",
      );
      if (conflict) {
        throw new ApiError({
          status: 409,
          message: "That time slot is already booked. Please choose another.",
        });
      }

      const now = new Date().toISOString();
      const appointmentId = createId("apt");
      const paymentId = createId("pay");
      const isOnline = input.paymentMethod === "ONLINE";

      const payment: Payment = {
        id: paymentId,
        appointmentId,
        patientId: input.patientId,
        amount: doctor.consultationFee,
        currency: "ETB",
        method: input.paymentMethod,
        // Payment status is tracked independently from appointment status.
        status: isOnline ? "PAID" : "UNPAID_AT_HOSPITAL",
        transactionRef: isOnline ? `MH-TXN-${Date.now()}` : undefined,
        createdAt: now,
        paidAt: isOnline ? now : undefined,
      };

      const appointment: Appointment = {
        id: appointmentId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        hospitalId: input.hospitalId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "BOOKED",
        reason: input.reason,
        paymentId,
        createdAt: now,
        updatedAt: now,
      };

      demoDb.mutate((database) => {
        database.payments = [payment, ...database.payments];
        database.appointments = [appointment, ...database.appointments];

        pushNotification(database, {
          userId: input.patientId,
          title: "Appointment confirmed",
          message: `Your appointment with ${doctor.fullName} on ${input.date} at ${input.startTime} is confirmed.`,
          type: "APPOINTMENT",
          link: "/patient/appointments",
        });
        pushNotification(database, {
          userId: doctor.id,
          title: "New appointment booked",
          message: `${patient.fullName} booked a consultation on ${input.date} at ${input.startTime}.`,
          type: "APPOINTMENT",
          link: "/doctor/appointments",
        });
      });

      return appointment;
    });
  }

  updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    return respond(() => {
      const appointment = findAppointment(id);
      if (appointment.status === status) return { ...appointment };

      return updateAppointment(id, (item) => {
        item.status = status;
      });
    });
  }

  cancel(id: string): Promise<Appointment> {
    return respond(() => {
      const before = findAppointment(id);
      if (before.status === "COMPLETED") {
        throw new ApiError({
          status: 409,
          message: "Completed appointments cannot be cancelled.",
        });
      }

      const updated = updateAppointment(id, (item) => {
        item.status = "CANCELLED";
      });

      demoDb.mutate((db) => {
        const doctor = db.doctors.find((item) => item.id === before.doctorId);
        pushNotification(db, {
          userId: before.doctorId,
          title: "Appointment cancelled",
          message: `An appointment on ${before.date} at ${before.startTime} was cancelled.`,
          type: "APPOINTMENT",
          link: "/doctor/appointments",
        });
        if (doctor) {
          pushNotification(db, {
            userId: before.patientId,
            title: "Appointment cancelled",
            message: `Your appointment with ${doctor.fullName} on ${before.date} was cancelled.`,
            type: "APPOINTMENT",
            link: "/patient/appointments",
          });
        }
      });

      return updated;
    });
  }

  complete(id: string): Promise<Appointment> {
    return respond(() => {
      // Marking a visit complete intentionally does not touch payment status.
      return updateAppointment(id, (item) => {
        item.status = "COMPLETED";
      });
    });
  }

  reschedule(
    id: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<Appointment> {
    return respond(() => {
      const current = findAppointment(id);
      if (current.status !== "BOOKED") {
        throw new ApiError({
          status: 409,
          message: "Only booked appointments can be rescheduled.",
        });
      }

      const conflict = demoDb.get().appointments.some(
        (appointment) =>
          appointment.id !== id &&
          appointment.doctorId === current.doctorId &&
          appointment.date === date &&
          appointment.startTime === startTime &&
          appointment.status !== "CANCELLED",
      );
      if (conflict) {
        throw new ApiError({
          status: 409,
          message: "That time slot is already booked.",
        });
      }

      return updateAppointment(id, (item) => {
        item.date = date;
        item.startTime = startTime;
        item.endTime = endTime;
      });
    });
  }
}

/** Helper used by the doctor dashboard to hydrate a doctor's profile. */
export function doctorById(id: string): Doctor | undefined {
  return demoDb.get().doctors.find((doctor) => doctor.id === id);
}
