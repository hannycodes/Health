import { ApiError } from "@/lib/http";
import type {
  AIRecommendation,
  AITriageInput,
  MedicalRecord,
  Payment,
  Specialty,
  UrgencyLevel,
} from "@/types";
import type {
  AINavigatorService,
  MedicalRecordService,
  PaymentService,
} from "@/services/interfaces";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

/* -------------------------------------------------------------------------- */
/*                              Medical records                               */
/* -------------------------------------------------------------------------- */

export class MockMedicalRecordService implements MedicalRecordService {
  listByPatient(patientId: string): Promise<MedicalRecord[]> {
    return respond(() =>
      demoDb
        .get()
        .medicalRecords.filter((record) => record.patientId === patientId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map((record) => ({ ...record })),
    );
  }

  listByDoctor(doctorId: string): Promise<MedicalRecord[]> {
    return respond(() =>
      demoDb
        .get()
        .medicalRecords.filter((record) => record.doctorId === doctorId)
        .map((record) => ({ ...record })),
    );
  }

  create(input: Omit<MedicalRecord, "id" | "recordedAt">): Promise<MedicalRecord> {
    return respond(() => {
      const record: MedicalRecord = {
        ...input,
        id: createId("rec"),
        recordedAt: new Date().toISOString(),
      };
      demoDb.mutate((db) => {
        db.medicalRecords = [record, ...db.medicalRecords];
      });
      return record;
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Payments                                  */
/* -------------------------------------------------------------------------- */

function findPayment(appointmentId: string): Payment {
  const payment = demoDb
    .get()
    .payments.find((item) => item.appointmentId === appointmentId);
  if (!payment) {
    throw new ApiError({ status: 404, message: "Payment record not found." });
  }
  return payment;
}

function updatePayment(appointmentId: string, mutate: (payment: Payment) => void) {
  let updated: Payment | undefined;
  demoDb.mutate((db) => {
    const payment = db.payments.find((item) => item.appointmentId === appointmentId);
    if (!payment) {
      throw new ApiError({ status: 404, message: "Payment record not found." });
    }
    mutate(payment);
    updated = { ...payment };
  });
  return updated as Payment;
}

export class MockPaymentService implements PaymentService {
  listByPatient(patientId: string): Promise<Payment[]> {
    return respond(() =>
      demoDb
        .get()
        .payments.filter((payment) => payment.patientId === patientId)
        .map((payment) => ({ ...payment })),
    );
  }

  listByHospital(hospitalId: string): Promise<Payment[]> {
    return respond(() => {
      const db = demoDb.get();
      const appointmentIds = new Set(
        db.appointments
          .filter((appointment) => appointment.hospitalId === hospitalId)
          .map((appointment) => appointment.id),
      );
      return db.payments
        .filter((payment) => appointmentIds.has(payment.appointmentId))
        .map((payment) => ({ ...payment }));
    });
  }

  getByAppointment(appointmentId: string): Promise<Payment | null> {
    return respond(() => {
      const payment = demoDb
        .get()
        .payments.find((item) => item.appointmentId === appointmentId);
      return payment ? { ...payment } : null;
    });
  }

  payOnline(appointmentId: string): Promise<Payment> {
    return respond(() => {
      const existing = findPayment(appointmentId);
      if (existing.status === "PAID") {
        return { ...existing };
      }
      return updatePayment(appointmentId, (payment) => {
        payment.status = "PAID";
        payment.method = "ONLINE";
        payment.paidAt = new Date().toISOString();
        payment.transactionRef = `MH-TXN-${Date.now()}`;
      });
    });
  }

  markPaidAtHospital(appointmentId: string): Promise<Payment> {
    return respond(() =>
      updatePayment(appointmentId, (payment) => {
        payment.status = "PAID";
        payment.method = "PAY_AT_HOSPITAL";
        payment.paidAt = new Date().toISOString();
      }),
    );
  }

  markFailed(appointmentId: string): Promise<Payment> {
    return respond(() =>
      updatePayment(appointmentId, (payment) => {
        payment.status = "FAILED";
      }),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                               AI navigator                                 */
/* -------------------------------------------------------------------------- */

interface TriageRule {
  specialty: Specialty;
  keywords: string[];
  urgency: UrgencyLevel;
  advice: string;
}

const TRIAGE_RULES: TriageRule[] = [
  {
    specialty: "Cardiology",
    keywords: ["chest", "heart", "palpitation", "blood pressure", "cardiac"],
    urgency: "HIGH",
    advice:
      "Book a cardiology consultation within 24–48 hours. If chest pain spreads to the arm or jaw, or you faint, go to the nearest emergency department immediately.",
  },
  {
    specialty: "Neurology",
    keywords: ["headache", "migraine", "seizure", "numbness", "dizzy", "stroke"],
    urgency: "MODERATE",
    advice:
      "A neurology review is recommended. Track when symptoms occur and avoid self-medicating before the visit.",
  },
  {
    specialty: "Dermatology",
    keywords: ["skin", "rash", "itch", "acne", "wound", "allergy"],
    urgency: "LOW",
    advice:
      "Book a dermatology appointment at your convenience. Avoid scratching and photograph the area to track changes.",
  },
  {
    specialty: "Orthopedics",
    keywords: ["bone", "joint", "knee", "back pain", "fracture", "sprain", "shoulder"],
    urgency: "MODERATE",
    advice:
      "An orthopedic assessment is appropriate. Keep the area rested and avoid heavy lifting until you are seen.",
  },
  {
    specialty: "Pediatrics",
    keywords: ["child", "baby", "infant", "toddler", "my son", "my daughter"],
    urgency: "MODERATE",
    advice:
      "A pediatric review is recommended. Monitor temperature and fluid intake, and bring the child's vaccination card.",
  },
  {
    specialty: "Obstetrics & Gynecology",
    keywords: ["pregnan", "antenatal", "prenatal", "period", "gynec", "maternal"],
    urgency: "MODERATE",
    advice:
      "Book an obstetrics and gynecology consultation. Seek urgent care if you have heavy bleeding or severe abdominal pain.",
  },
  {
    specialty: "Ophthalmology",
    keywords: ["eye", "vision", "sight", "blurry", "conjunctivitis"],
    urgency: "LOW",
    advice:
      "An eye clinic visit is recommended. Avoid rubbing your eyes and stop wearing contact lenses until reviewed.",
  },
  {
    specialty: "General Medicine",
    keywords: ["fever", "cough", "cold", "fatigue", "stomach", "nausea", "flu"],
    urgency: "LOW",
    advice:
      "Start with a general medicine consultation. Stay hydrated and return if symptoms worsen after three days.",
  },
];

const EMERGENCY_KEYWORDS = [
  "unconscious",
  "severe bleeding",
  "cannot breathe",
  "can't breathe",
  "collapsed",
  "seizure now",
];

/**
 * Deterministic, rule-based triage.
 *
 * MOCK ONLY: no AI provider is called. It exists so the AI Navigator UI can be
 * built and tested end-to-end. Real triage will call the backend AI endpoint.
 */
export class MockAINavigatorService implements AINavigatorService {
  analyze(input: AITriageInput): Promise<AIRecommendation> {
    return respond(
      () => {
        const symptoms = input.symptoms.trim();
        if (symptoms.length < 10) {
          throw new ApiError({
            status: 422,
            message: "Please describe your symptoms in at least 10 characters.",
          });
        }

        const text = symptoms.toLowerCase();
        const rule =
          TRIAGE_RULES.find((candidate) =>
            candidate.keywords.some((keyword) => text.includes(keyword)),
          ) ?? TRIAGE_RULES[TRIAGE_RULES.length - 1];

        const isEmergency = EMERGENCY_KEYWORDS.some((keyword) =>
          text.includes(keyword),
        );

        const db = demoDb.get();
        const matchingDoctors = db.doctors.filter(
          (doctor) => doctor.specialty === rule.specialty,
        );
        const hospitalIds = Array.from(
          new Set(matchingDoctors.map((doctor) => doctor.hospitalId)),
        );

        const recommendation: AIRecommendation = {
          id: createId("ais"),
          patientId: input.patientId,
          symptoms,
          symptomsSummary: `Your description points toward ${rule.specialty.toLowerCase()}. ${isEmergency ? "This may be an emergency." : ""}`.trim(),
          recommendedSpecialty: rule.specialty,
          urgency: isEmergency ? "EMERGENCY" : rule.urgency,
          advice: isEmergency
            ? "Call emergency services or go to the nearest emergency department now. Do not wait for an appointment."
            : rule.advice,
          recommendedDoctorIds: matchingDoctors.map((doctor) => doctor.id),
          recommendedHospitalIds: hospitalIds,
          createdAt: new Date().toISOString(),
        };

        demoDb.mutate((database) => {
          database.recommendations = [recommendation, ...database.recommendations];
        });

        return recommendation;
      },
      600,
    );
  }

  listByPatient(patientId: string): Promise<AIRecommendation[]> {
    return respond(() =>
      demoDb
        .get()
        .recommendations.filter((item) => item.patientId === patientId)
        .map((item) => ({ ...item })),
    );
  }
}
