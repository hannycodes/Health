import type { Patient, PatientHealthContext } from "@/types";

/**
 * Health profile helpers.
 *
 * BMI is a screening measurement, never a diagnosis: the UI always pairs the
 * number with the explanation returned by `bmiCategory`.
 */

/** The API stores some profile fields as free text; the UI accepts either. */
export function toList(value: string | string[] | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const MIN_WEIGHT_KG = 2;
export const MAX_WEIGHT_KG = 400;
export const MIN_HEIGHT_CM = 30;
export const MAX_HEIGHT_CM = 260;

/** Whole years between `dateOfBirth` (YYYY-MM-DD) and today. */
export function calculateAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthday) age -= 1;

  return age >= 0 && age < 130 ? age : undefined;
}

/**
 * BMI = kg / m². Returns null unless both measurements are present and
 * plausible, so the UI never shows a value derived from bad input.
 */
export function calculateBmi(
  weightKg?: number | null,
  heightCm?: number | null,
): number | null {
  if (typeof weightKg !== "number" || typeof heightCm !== "number") return null;
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) return null;
  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) return null;

  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Neutral wording — deliberately not a clinical classification. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Below the typical screening range";
  if (bmi < 25) return "Within the typical screening range";
  if (bmi < 30) return "Above the typical screening range";
  return "Well above the typical screening range";
}

export const BMI_EXPLANATION =
  "BMI is a screening measurement calculated from height and weight. It is not a diagnosis and does not replace an assessment by a clinician.";

/** True when the patient has any saved health measurement. */
export function hasHealthProfile(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return (
    typeof patient.weightKg === "number" ||
    typeof patient.heightCm === "number" ||
    Boolean(patient.dateOfBirth)
  );
}

/**
 * Builds the permitted AI context. Missing fields stay `undefined`; we never
 * fill a gap with a guessed value.
 */
export function toPatientHealthContext(
  patient: Patient | null | undefined,
): PatientHealthContext {
  const context: PatientHealthContext = {};
  if (!patient) return context;

  const age = calculateAge(patient.dateOfBirth);
  if (age !== undefined) context.age = age;
  if (typeof patient.weightKg === "number") context.weightKg = patient.weightKg;
  if (typeof patient.heightCm === "number") context.heightCm = patient.heightCm;
  const allergies = toList(patient.allergies);
  const conditions = toList(patient.conditions);
  const medications = toList(patient.medications ?? patient.currentMedications);
  if (allergies.length) context.allergies = allergies;
  if (conditions.length) context.conditions = conditions;
  if (medications.length) context.medications = medications;

  return context;
}
