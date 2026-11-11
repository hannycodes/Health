import express from "express";

import { db, nextId, saveDb } from "../db.js";
import { HttpError, requireRole } from "../auth.js";
import {
  assert,
  assertAppointmentAccess,
  DATE_PATTERN,
  expandAppointment,
  findPaymentByAppointment,
  getDoctor,
  getHospital,
  getUser,
  notifyHospitalAdmins,
  pushNotification,
  requireHospitalScope,
  scopedHospitalId,
  sortAppointments,
  TIME_PATTERN,
  todayISO,
} from "../helpers.js";

const APPOINTMENT_STATUSES = ["BOOKED", "CANCELLED", "COMPLETED"];
const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function weekdayOf(date) {
  return DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function assertSlotTimes(date, startTime, endTime) {
  assert(DATE_PATTERN.test(String(date ?? "")), 422, "Choose a valid appointment date (YYYY-MM-DD).");
  assert(TIME_PATTERN.test(String(startTime ?? "")), 422, "Start time must be HH:mm.");
  assert(TIME_PATTERN.test(String(endTime ?? "")), 422, "End time must be HH:mm.");
  assert(toMinutes(endTime) > toMinutes(startTime), 422, "End time must be after the start time.");
}

/** One doctor or one patient cannot hold two overlapping bookings. */
function assertNoClash({ doctorId, patientId, date, startTime, endTime, ignoreId }) {
  const clash = db.appointments.find(
    (appointment) =>
      appointment.id !== ignoreId &&
      appointment.status === "BOOKED" &&
      appointment.date === date &&
      overlaps(appointment.startTime, appointment.endTime, startTime, endTime) &&
      (appointment.doctorId === doctorId || appointment.patientId === patientId),
  );

  if (!clash) return;
  if (clash.doctorId === doctorId) {
    throw new HttpError(409, "That doctor is already booked for this time slot.");
  }
  throw new HttpError(409, "This patient already has an appointment at that time.");
}

function assertBookable(doctor, hospitalId, date, startTime, endTime) {
  assert(doctor.isActive !== false, 409, "This doctor is not currently active.");
  assert(
    doctor.accountStatus !== "PENDING_INVITATION",
    409,
    "This doctor has not activated their account yet.",
  );
  assert(doctor.hospitalId === hospitalId, 422, "The doctor does not work at the selected hospital.");

  const hospital = getHospital(hospitalId);
  assert(hospital, 404, "Hospital not found.");
  assert(hospital.approvalStatus === "APPROVED", 409, "This hospital is not approved to take appointments.");

  assert(date >= todayISO(), 422, "Appointments cannot be booked in the past.");

  // A doctor with no published hours is bookable; published hours are enforced.
  const slots = db.availability.filter(
    (slot) => slot.doctorId === doctor.id && slot.isActive && slot.dayOfWeek === weekdayOf(date),
  );
  if (slots.length === 0) return;

  const covered = slots.some(
    (slot) =>
      toMinutes(startTime) >= toMinutes(slot.startTime) &&
      toMinutes(endTime) <= toMinutes(slot.endTime),
  );
  assert(covered, 422, `The doctor does not consult at that time on ${weekdayOf(date)}.`);
}

function notifyDoctor(doctorId, title, message, link) {
  pushNotification({ userId: doctorId, title, message, type: "APPOINTMENT", link });
}

function notifyPatient(patientId, title, message, link) {
  pushNotification({ userId: patientId, title, message, type: "APPOINTMENT", link });
}

export function schedulingRoutes(auth) {
  const router = express.Router();

  router.use(auth);

  /* ---------------------------------------------------------------------- */
  /*                              Appointments                              */
  /* ---------------------------------------------------------------------- */

  router.get("/appointments", (req, res) => {
    const { status, date, expand } = req.query;
    let { patientId, doctorId, hospitalId } = req.query;

    if (req.user.role === "PATIENT") {
      assert(!patientId || patientId === req.user.id, 403, "You can only view your own appointments.");
      patientId = req.user.id;
    } else if (req.user.role === "DOCTOR") {
      assert(!doctorId || doctorId === req.user.id, 403, "You can only view your own appointments.");
      doctorId = req.user.id;
    } else if (req.user.role === "HOSPITAL_ADMIN") {
      hospitalId = scopedHospitalId(req.user, hospitalId);
    }

    const rows = sortAppointments(
      db.appointments.filter((appointment) => {
        if (patientId && appointment.patientId !== patientId) return false;
        if (doctorId && appointment.doctorId !== doctorId) return false;
        if (hospitalId && appointment.hospitalId !== hospitalId) return false;
        if (status && appointment.status !== status) return false;
        if (date && appointment.date !== date) return false;
        return true;
      }),
    );

    res.json(expand ? rows.map(expandAppointment) : rows);
  });

  router.get("/appointments/:id", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.id);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);
    res.json(appointment);
  });

  router.post("/appointments", requireRole("PATIENT", "SUPER_ADMIN"), (req, res) => {
    const body = req.body ?? {};
    const patientId = req.user.role === "PATIENT" ? req.user.id : body.patientId;
    assert(patientId, 422, "A patient is required.");

    if (req.user.role === "PATIENT") {
      assert(
        !body.patientId || body.patientId === req.user.id,
        403,
        "You can only book appointments for yourself.",
      );
    }

    const patient = getUser(patientId);
    assert(patient && patient.role === "PATIENT", 404, "Patient not found.");

    const doctor = getDoctor(body.doctorId);
    assert(doctor, 404, "Doctor not found.");

    const hospitalId = body.hospitalId || doctor.hospitalId;
    assertSlotTimes(body.date, body.startTime, body.endTime);
    assertBookable(doctor, hospitalId, body.date, body.startTime, body.endTime);
    assertNoClash({
      doctorId: doctor.id,
      patientId: patient.id,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
    });

    assert(
      typeof body.reason === "string" && body.reason.trim().length >= 10,
      422,
      "Describe the reason for the visit in at least 10 characters.",
    );

    const method = body.paymentMethod ?? "PAY_AT_HOSPITAL";
    assert(
      ["ONLINE", "PAY_AT_HOSPITAL"].includes(method),
      422,
      "Payment method must be ONLINE or PAY_AT_HOSPITAL.",
    );

    const now = new Date().toISOString();
    const appointmentId = nextId("apt");
    const isOnline = method === "ONLINE";

    const payment = {
      id: nextId("pay"),
      appointmentId,
      patientId: patient.id,
      amount: doctor.consultationFee,
      currency: "ETB",
      method,
      status: isOnline ? "PAID" : "UNPAID_AT_HOSPITAL",
      transactionRef: isOnline ? `MH-TXN-${Date.now()}` : undefined,
      createdAt: now,
      paidAt: isOnline ? now : undefined,
    };

    const appointment = {
      id: appointmentId,
      patientId: patient.id,
      doctorId: doctor.id,
      hospitalId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      status: "BOOKED",
      reason: body.reason.trim(),
      paymentId: payment.id,
      createdAt: now,
      updatedAt: now,
    };

    db.appointments = [...db.appointments, appointment];
    db.payments = [...db.payments, payment];

    notifyDoctor(
      doctor.id,
      "New appointment booked",
      `${patient.fullName} booked ${appointment.date} at ${appointment.startTime}.`,
      "/doctor/appointments",
    );
    notifyHospitalAdmins(
      hospitalId,
      "New appointment",
      `${patient.fullName} booked with ${doctor.fullName} on ${appointment.date}.`,
      "/hospital-admin/appointments",
    );

    saveDb();
    res.status(201).json(appointment);
  });

  router.patch("/appointments/:id", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.id);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);

    const { status } = req.body ?? {};
    assert(APPOINTMENT_STATUSES.includes(status), 422, "Status must be BOOKED, CANCELLED or COMPLETED.");

    if (req.user.role === "PATIENT") {
      assert(status === "CANCELLED", 403, "Patients can only cancel their own appointment.");
    }
    assert(appointment.status === "BOOKED", 409, "A completed or cancelled appointment can no longer change.");

    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();

    if (status === "CANCELLED") {
      notifyDoctor(appointment.doctorId, "Appointment cancelled", "A booked appointment was cancelled.", "/doctor/appointments");
    }

    saveDb();
    res.json(appointment);
  });

  router.post("/appointments/:id/cancel", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.id);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);
    assert(appointment.status === "BOOKED", 409, "Only a booked appointment can be cancelled.");

    appointment.status = "CANCELLED";
    appointment.updatedAt = new Date().toISOString();

    if (req.user.id !== appointment.doctorId) {
      notifyDoctor(
        appointment.doctorId,
        "Appointment cancelled",
        `The appointment on ${appointment.date} at ${appointment.startTime} was cancelled.`,
        "/doctor/appointments",
      );
    }
    if (req.user.id !== appointment.patientId) {
      notifyPatient(
        appointment.patientId,
        "Appointment cancelled",
        `Your appointment on ${appointment.date} at ${appointment.startTime} was cancelled.`,
        "/patient/appointments",
      );
    }

    saveDb();
    res.json(appointment);
  });

  router.post("/appointments/:id/complete", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.id);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);
    assert(req.user.role !== "PATIENT", 403, "Only clinical staff can complete an appointment.");
    assert(appointment.status === "BOOKED", 409, "Only a booked appointment can be completed.");

    appointment.status = "COMPLETED";
    appointment.updatedAt = new Date().toISOString();

    notifyPatient(
      appointment.patientId,
      "Appointment completed",
      `Your appointment on ${appointment.date} is marked completed.`,
      "/patient/appointments",
    );

    saveDb();
    res.json(appointment);
  });

  router.patch("/appointments/:id/reschedule", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.id);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);
    assert(appointment.status === "BOOKED", 409, "Only a booked appointment can be rescheduled.");

    const { date, startTime, endTime } = req.body ?? {};
    assertSlotTimes(date, startTime, endTime);

    const doctor = getDoctor(appointment.doctorId);
    assert(doctor, 404, "Doctor not found.");
    assertBookable(doctor, appointment.hospitalId, date, startTime, endTime);
    assertNoClash({
      doctorId: doctor.id,
      patientId: appointment.patientId,
      date,
      startTime,
      endTime,
      ignoreId: appointment.id,
    });

    appointment.date = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.updatedAt = new Date().toISOString();

    notifyPatient(
      appointment.patientId,
      "Appointment rescheduled",
      `Your appointment is now on ${date} at ${startTime}.`,
      "/patient/appointments",
    );
    notifyDoctor(
      appointment.doctorId,
      "Appointment rescheduled",
      `An appointment moved to ${date} at ${startTime}.`,
      "/doctor/appointments",
    );

    saveDb();
    res.json(appointment);
  });

  /* ---------------------------------------------------------------------- */
  /*                                Payments                                */
  /* ---------------------------------------------------------------------- */

  router.get("/payments", (req, res) => {
    const { appointmentId, status } = req.query;
    let { patientId, hospitalId } = req.query;

    if (appointmentId) {
      const appointment = db.appointments.find((item) => item.id === appointmentId);
      assert(appointment, 404, "Appointment not found.");
      assertAppointmentAccess(req.user, appointment);
      return res.json(findPaymentByAppointment(appointment.id) ?? null);
    }

    if (req.user.role === "PATIENT") {
      assert(!patientId || patientId === req.user.id, 403, "You can only view your own payments.");
      patientId = req.user.id;
    } else if (req.user.role === "HOSPITAL_ADMIN") {
      hospitalId = scopedHospitalId(req.user, hospitalId);
    }

    let rows = db.payments.filter((payment) => {
      if (patientId && payment.patientId !== patientId) return false;
      if (status && payment.status !== status) return false;
      if (hospitalId) {
        const appointment = db.appointments.find((item) => item.id === payment.appointmentId);
        if (!appointment || appointment.hospitalId !== hospitalId) return false;
      }
      return true;
    });

    if (req.user.role === "DOCTOR") {
      const mine = new Set(
        db.appointments.filter((item) => item.doctorId === req.user.id).map((item) => item.id),
      );
      rows = rows.filter((payment) => mine.has(payment.appointmentId));
    }

    res.json(rows);
  });

  router.post("/payments/:appointmentId/pay", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.appointmentId);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);

    const payment = findPaymentByAppointment(appointment.id);
    assert(payment, 404, "No payment is attached to this appointment.");
    assert(payment.method === "ONLINE", 409, "This appointment is paid at the hospital, not online.");
    assert(
      ["PENDING", "FAILED"].includes(payment.status),
      409,
      "This payment has already been settled.",
    );

    const now = new Date().toISOString();
    payment.status = "PAID";
    payment.paidAt = now;
    payment.transactionRef = payment.transactionRef ?? `MH-TXN-${Date.now()}`;

    notifyHospitalAdmins(
      appointment.hospitalId,
      "Payment received",
      `${payment.amount} ETB was paid online for appointment ${appointment.id}.`,
      "/hospital-admin/payments",
    );

    saveDb();
    res.json(payment);
  });

  router.post(
    "/payments/:appointmentId/mark-paid",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const appointment = db.appointments.find((item) => item.id === req.params.appointmentId);
      assert(appointment, 404, "Appointment not found.");
      requireHospitalScope(req.user, appointment.hospitalId);

      const payment = findPaymentByAppointment(appointment.id);
      assert(payment, 404, "No payment is attached to this appointment.");
      assert(
        payment.method === "PAY_AT_HOSPITAL",
        409, 
        "Only pay-at-hospital fees can be settled at the desk.",
      );
      assert(payment.status === "UNPAID_AT_HOSPITAL", 409, "This payment is not outstanding.");

      const now = new Date().toISOString();
      payment.status = "PAID";
      payment.paidAt = now;

      notifyPatient(
        appointment.patientId,
        "Payment recorded",
        `Your ${payment.amount} ETB hospital payment was recorded on ${now.slice(0, 10)}.`,
        "/patient/payments",
      );

      saveDb();
      res.json(payment);
    },
  );

  router.post("/payments/:appointmentId/mark-failed", (req, res) => {
    const appointment = db.appointments.find((item) => item.id === req.params.appointmentId);
    assert(appointment, 404, "Appointment not found.");
    assertAppointmentAccess(req.user, appointment);

    const payment = findPaymentByAppointment(appointment.id);
    assert(payment, 404, "No payment is attached to this appointment.");
    assert(payment.method === "ONLINE", 409, "Only online payments can fail.");
    assert(payment.status === "PENDING", 409, "Only a pending payment can fail.");

    payment.status = "FAILED";
    saveDb();
    res.json(payment);
  });

  /* ---------------------------------------------------------------------- */
  /*                              Notifications                             */
  /* ---------------------------------------------------------------------- */

  router.get("/notifications/unread-count", (req, res) => {
    const count = db.notifications.filter(
      (notification) => notification.userId === req.user.id && !notification.isRead,
    ).length;
    res.json(count);
  });

  router.get("/notifications", (req, res) => {
    const requested = req.query.userId;
    const canSeeOthers = req.user.role === "SUPER_ADMIN";
    assert(
      canSeeOthers || !requested || requested === req.user.id,
      403,
      "You can only view your own notifications.",
    );

    const userId = canSeeOthers && requested ? requested : req.user.id;
    res.json(db.notifications.filter((notification) => notification.userId === userId));
  });

  router.post("/notifications/read-all", (req, res) => {
    db.notifications.forEach((notification) => {
      if (notification.userId === req.user.id) notification.isRead = true;
    });
    saveDb();
    res.status(204).end();
  });

  router.post("/notifications/:id/read", (req, res) => {
    const notification = db.notifications.find((item) => item.id === req.params.id);
    assert(notification, 404, "Notification not found.");
    assert(notification.userId === req.user.id, 403, "That notification belongs to another account.");

    notification.isRead = true;
    saveDb();
    res.status(204).end();
  });

  return router;
}
