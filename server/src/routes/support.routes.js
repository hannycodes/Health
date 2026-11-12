import express from "express";

import { db, nextId, saveDb } from "../db.js";
import { HttpError, requireRole } from "../auth.js";
import { assert, getDoctor, getHospital, getUser } from "../helpers.js";

/**
 * Deliberately simple, deterministic triage.
 *
 * A keyword rule set is enough for a student project and keeps the API honest:
 * it never claims a diagnosis, only a specialty to start with and how soon.
 */
const TRIAGE_RULES = [
  {
    keywords: ["chest pain", "palpitation", "heart", "blood pressure", "hypertension"],
    specialty: "Cardiology",
    urgency: "HIGH",
  },
  {
    keywords: ["headache", "migraine", "seizure", "numbness", "dizzy", "epilepsy"],
    specialty: "Neurology",
    urgency: "MODERATE",
  },
  {
    keywords: ["rash", "skin", "itch", "acne", "dermatitis"],
    specialty: "Dermatology",
    urgency: "LOW",
  },
  {
    keywords: ["child", "baby", "infant", "toddler", "paediatric", "pediatric"],
    specialty: "Pediatrics",
    urgency: "MODERATE",
  },
  {
    keywords: ["pregnan", "antenatal", "period", "menstrual", "gynecolog"],
    specialty: "Obstetrics & Gynecology",
    urgency: "MODERATE",
  },
  {
    keywords: ["fracture", "bone", "joint", "knee", "back pain", "sprain"],
    specialty: "Orthopedics",
    urgency: "MODERATE",
  },
  {
    keywords: ["eye", "vision", "blurred", "cataract"],
    specialty: "Ophthalmology",
    urgency: "MODERATE",
  },
  {
    keywords: ["anxiety", "depress", "sleepless", "insomnia", "stress", "panic"],
    specialty: "Psychiatry",
    urgency: "MODERATE",
  },
  { keywords: ["lump", "tumour", "tumor", "cancer"], specialty: "Oncology", urgency: "HIGH" },
];

const EMERGENCY_KEYWORDS = [
  "unconscious",
  "not breathing",
  "severe bleeding",
  "suicidal",
  "stroke",
  "chest pain severe",
];

function summarise(symptoms) {
  const flat = symptoms.replace(/\s+/g, " ").trim();
  const clipped = flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

function triage(symptoms) {
  const text = symptoms.toLowerCase();
  const emergency = EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword));
  const rule = TRIAGE_RULES.find((candidate) =>
    candidate.keywords.some((keyword) => text.includes(keyword)),
  );

  if (emergency) {
    return {
      specialty: rule?.specialty ?? "General Medicine",
      urgency: "EMERGENCY",
      advice:
        "Go to the nearest hospital emergency department now. If you cannot travel safely, call an ambulance.",
    };
  }

  if (!rule) {
    return {
      specialty: "General Medicine",
      urgency: "LOW",
      advice:
        "Start with a general practitioner who can assess you and refer you to a specialist if needed.",
    };
  }

  const adviceByUrgency = {
    HIGH: "Book the earliest available appointment with this specialist, or visit urgent care if symptoms worsen.",
    MODERATE: "Book an appointment with this specialist within the next few days.",
    LOW: "Book a routine appointment with this specialist at your convenience.",
  };

  return {
    specialty: rule.specialty,
    urgency: rule.urgency,
    advice: adviceByUrgency[rule.urgency],
  };
}

export function supportRoutes(auth) {
  const router = express.Router();

  router.use(auth);

  /* ---------------------------------------------------------------------- */
  /*                             Medical records                            */
  /* ---------------------------------------------------------------------- */

  router.get("/medical-records", (req, res) => {
    assert(
      req.user.role !== "HOSPITAL_ADMIN",
      403,
      "Clinical records are not available to hospital administrators.",
    );

    const { patientId, doctorId } = req.query;
    let rows = db.medicalRecords;

    if (req.user.role === "PATIENT") {
      rows = rows.filter((record) => record.patientId === req.user.id);
    } else if (req.user.role === "DOCTOR") {
      // Doctors see their own records, plus the full history of any patient
      // who has booked with them. Hospital administrators stay excluded above.
      const inCare = new Set(
        db.appointments
          .filter((appointment) => appointment.doctorId === req.user.id)
          .map((appointment) => appointment.patientId),
      );
      if (patientId && inCare.has(patientId)) {
        rows = rows.filter((record) => record.patientId === patientId);
      } else {
        rows = rows.filter((record) => record.doctorId === req.user.id);
      }
    }

    if (patientId) rows = rows.filter((record) => record.patientId === patientId);
    if (doctorId) rows = rows.filter((record) => record.doctorId === doctorId);

    res.json([...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
  });

  router.post("/medical-records", requireRole("DOCTOR"), (req, res) => {
    const body = req.body ?? {};
    const patient = getUser(body.patientId);
    assert(patient && patient.role === "PATIENT", 404, "Patient not found.");

    let appointment;
    if (body.appointmentId) {
      appointment = db.appointments.find((item) => item.id === body.appointmentId);
      assert(appointment, 404, "Appointment not found.");
      assert(
        appointment.doctorId === req.user.id,
        403,
        "You can only write records for your own appointments.",
      );
      assert(
        appointment.patientId === patient.id,
        422,
        "That appointment belongs to a different patient.",
      );
    } else {
      const inCare = db.appointments.some(
        (item) => item.doctorId === req.user.id && item.patientId === patient.id,
      );
      assert(inCare, 403, "This patient is not in your care.");
    }

    assert(
      typeof body.diagnosis === "string" && body.diagnosis.trim().length >= 5,
      422,
      "Enter a diagnosis of at least 5 characters.",
    );
    assert(
      typeof body.treatment === "string" && body.treatment.trim().length >= 5,
      422,
      "Describe the treatment in at least 5 characters.",
    );

    const prescription = Array.isArray(body.prescription)
      ? body.prescription.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const record = {
      id: nextId("mrec"),
      patientId: patient.id,
      doctorId: req.user.id,
      hospitalId: appointment?.hospitalId ?? req.user.hospitalId,
      appointmentId: appointment?.id,
      diagnosis: body.diagnosis.trim(),
      treatment: body.treatment.trim(),
      prescription,
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
      recordedAt: new Date().toISOString(),
    };

    db.medicalRecords = [record, ...db.medicalRecords];
    saveDb();
    res.status(201).json(record);
  });

  /* ---------------------------------------------------------------------- */
  /*                           AI health assistant                          */
  /* ---------------------------------------------------------------------- */

  function conversationFor(req, id) {
    const conversation = db.aiConversations.find((item) => item.id === id);
    assert(conversation, 404, "Conversation not found.");
    assert(
      conversation.patientId === req.user.id || req.user.role === "SUPER_ADMIN",
      403,
      "That conversation belongs to another patient.",
    );
    return conversation;
  }

  router.get("/ai/conversations", (req, res) => {
    const requested = req.query.patientId;
    assert(
      !requested || requested === req.user.id,
      403,
      "You can only view your own conversations.",
    );
    const rows = db.aiConversations
      .filter((item) => item.patientId === req.user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(rows);
  });

  router.post("/ai/conversations", (req, res) => {
    const now = new Date().toISOString();
    const conversation = {
      id: nextId("cnv"),
      patientId: req.user.id,
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    db.aiConversations = [...db.aiConversations, conversation];
    saveDb();
    res.status(201).json(conversation);
  });

  router.get("/ai/conversations/:id", (req, res) => {
    res.json(conversationFor(req, req.params.id));
  });

  /**
   * Patient health assistant.
   *
   * Uses the same deterministic triage rules as the navigator, recommends real
   * seeded doctors, and keeps the whole conversation so a new chat remembers
   * the patient's earlier concerns.
   */
  router.post("/ai/health-assistant/messages", (req, res) => {
    const body = req.body ?? {};
    const patient = getUser(req.user.id);
    assert(patient && patient.role === "PATIENT", 403, "Only patients can use this assistant.");

    const message = typeof body.message === "string" ? body.message.trim() : "";
    assert(message.length >= 2 || Array.isArray(body.imageIds), 422, "Type a message first.");

    let conversation;
    if (body.conversationId) {
      conversation = conversationFor(req, body.conversationId);
    } else {
      const now = new Date().toISOString();
      conversation = {
        id: nextId("cnv"),
        patientId: patient.id,
        title: "New conversation",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      db.aiConversations = [...db.aiConversations, conversation];
    }

    const result = triage(message);
    const urgencyMap = {
      EMERGENCY: "EMERGENCY",
      HIGH: "URGENT",
      MODERATE: "ROUTINE",
      LOW: "ROUTINE",
    };

    const doctors = db.users
      .filter(
        (user) =>
          user.role === "DOCTOR" &&
          user.specialty === result.specialty &&
          user.isActive !== false &&
          user.accountStatus !== "PENDING_INVITATION",
      )
      .filter((user) => {
        const hospital = getHospital(user.hospitalId);
        return hospital && hospital.approvalStatus === "APPROVED";
      })
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3);

    const history = db.aiConversations
      .filter((item) => item.patientId === patient.id && item.id !== conversation.id)
      .flatMap((item) => item.messages.filter((entry) => entry.role === "ASSISTANT"))
      .slice(-2);

    const memory = history.length
      ? ` Earlier you discussed: ${history.map((entry) => entry.content.split(".")[0]).join("; ")}.`
      : "";

    const doctorLine = doctors.length
      ? ` Suggested doctors: ${doctors
          .map((doctor) => `${doctor.fullName} (${doctor.specialty})`)
          .join(", ")}.`
      : " No matching doctor is currently available — start with General Medicine.";

    const content = `${result.advice}${doctorLine}${memory}`.trim();
    const now = new Date().toISOString();

    const patientMessage = {
      id: nextId("msg"),
      conversationId: conversation.id,
      role: "PATIENT",
      content: message || "Shared an image.",
      attachments: [],
      isMock: false,
      createdAt: now,
    };

    const assistantMessage = {
      id: nextId("msg"),
      conversationId: conversation.id,
      role: "ASSISTANT",
      content,
      attachments: [],
      urgency: urgencyMap[result.urgency] ?? "INFORMATIONAL",
      followUpQuestions: [
        "How long have you had these symptoms?",
        "Is anything making it worse or better?",
      ],
      recommendations: [
        `See a ${result.specialty} specialist.`,
        ...(doctors.length ? [] : ["Book a General Medicine consultation first."]),
      ],
      disclaimer:
        "This is guidance, not a diagnosis. For emergencies, contact emergency services immediately.",
      recommendedDoctorIds: doctors.map((doctor) => doctor.id),
      recommendedHospitalIds: [...new Set(doctors.map((doctor) => doctor.hospitalId))],
      isMock: true,
      createdAt: now,
    };

    conversation.messages.push(patientMessage, assistantMessage);
    conversation.updatedAt = now;
    if (conversation.messages.length <= 2) {
      conversation.title = (message || "Image consultation").slice(0, 60);
    }
    saveDb();

    res.status(201).json({
      conversationId: conversation.id,
      message: content,
      urgency: assistantMessage.urgency,
      followUpQuestions: assistantMessage.followUpQuestions,
      recommendations: assistantMessage.recommendations,
      disclaimer: assistantMessage.disclaimer,
      recommendedDoctorIds: assistantMessage.recommendedDoctorIds,
      recommendedHospitalIds: assistantMessage.recommendedHospitalIds,
      isMock: true,
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              AI navigator                              */
  /* ---------------------------------------------------------------------- */

  router.post("/ai/triage", requireRole("PATIENT"), (req, res) => {
    const { symptoms } = req.body ?? {};
    assert(
      typeof symptoms === "string" && symptoms.trim().length >= 10,
      422,
      "Describe your symptoms in at least 10 characters.",
    );

    const result = triage(symptoms);

    const doctors = db.users
      .filter(
        (user) =>
          user.role === "DOCTOR" &&
          user.specialty === result.specialty &&
          user.isActive !== false &&
          user.accountStatus !== "PENDING_INVITATION",
      )
      .sort((a, b) => b.rating - a.rating);

    const hospitalIds = new Set(doctors.map((doctor) => doctor.hospitalId));

    const recommendation = {
      id: nextId("air"),
      patientId: req.user.id,
      symptoms: symptoms.trim(),
      symptomsSummary: summarise(symptoms),
      recommendedSpecialty: result.specialty,
      urgency: result.urgency,
      advice: result.advice,
      recommendedDoctorIds: doctors.map((doctor) => doctor.id),
      recommendedHospitalIds: [...hospitalIds].filter((id) => {
        const hospital = getHospital(id);
        return hospital && hospital.approvalStatus === "APPROVED";
      }),
      createdAt: new Date().toISOString(),
    };

    db.recommendations = [recommendation, ...db.recommendations];
    saveDb();
    res.status(201).json(recommendation);
  });

  router.get("/ai/recommendations", (req, res) => {
    const { patientId } = req.query;
    const canSeeOthers = req.user.role === "SUPER_ADMIN";

    assert(
      canSeeOthers || (req.user.role === "PATIENT" && (!patientId || patientId === req.user.id)),
      403,
      "You can only view your own recommendations.",
    );

    const owner = canSeeOthers && patientId ? patientId : req.user.id;
    res.json(
      db.recommendations
        .filter((item) => item.patientId === owner)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  });

  /* ---------------------------------------------------------------------- */
  /*                                 Doctors                                */
  /* ---------------------------------------------------------------------- */

  router.get("/doctors/:id/summary", (req, res) => {
    const doctor = getDoctor(req.params.id);
    assert(doctor, 404, "Doctor not found.");

    const hospital = getHospital(doctor.hospitalId);
    const appointments = db.appointments.filter(
      (appointment) => appointment.doctorId === doctor.id,
    );

    res.json({
      doctorId: doctor.id,
      hospitalName: hospital?.name,
      specialty: doctor.specialty,
      rating: doctor.rating,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter((item) => item.status === "COMPLETED").length,
      isAcceptingPatients: doctor.isAcceptingPatients,
    });
  });

  return router;
}
