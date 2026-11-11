import { hashPassword } from "./auth.js";

/**
 * Single seed for the one MyHealth API.
 *
 * Merges the hospital-coordination dataset (departments, appointments, payments,
 * availability, clinical records) with the platform-administration dataset
 * (hospital applications, audit trail, platform settings, account statuses).
 * Every record is internally consistent: doctors belong to hospitals and
 * departments, appointments reference real doctors/patients/hospitals, payments
 * reference valid appointments, and audit entries point at real entities.
 */

export const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD ?? "myhealth123";

const seededAt = new Date("2026-10-01T08:00:00.000Z").toISOString();

function pad(value) {
  return String(value).padStart(2, "0");
}

function localISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localISO(date);
}

export function seedDatabase() {
  const passwordHash = hashPassword(DEV_PASSWORD);

  /* ---------------------------------- Users -------------------------------- */

  const patients = [
    {
      id: "pat-001",
      email: "patient@myhealth.et",
      fullName: "Abebe Tesfaye",
      role: "PATIENT",
      phone: "+251 911 234 567",
      dateOfBirth: "1989-04-12",
      gender: "MALE",
      bloodType: "O+",
      address: "Bole Sub-city, Woreda 03, Addis Ababa",
      emergencyContact: "+251 911 765 432 — Meseret Tesfaye",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "pat-002",
      email: "hana.girma@example.com",
      fullName: "Hana Girma",
      role: "PATIENT",
      phone: "+251 912 118 442",
      dateOfBirth: "1996-11-02",
      gender: "FEMALE",
      bloodType: "A+",
      address: "Kirkos Sub-city, Addis Ababa",
      status: "ACTIVE",
      createdAt: "2026-10-18T09:12:00.000Z",
    },
    {
      id: "pat-003",
      email: "dawit.mekonnen@example.com",
      fullName: "Dawit Mekonnen",
      role: "PATIENT",
      phone: "+251 918 664 129",
      dateOfBirth: "1978-06-25",
      gender: "MALE",
      bloodType: "B+",
      address: "Hawassa, Sidama",
      status: "ACTIVE",
      createdAt: "2026-09-02T10:00:00.000Z",
    },
    {
      id: "pat-004",
      email: "marta.alemu@example.com",
      fullName: "Marta Alemu",
      role: "PATIENT",
      phone: "+251 914 552 310",
      dateOfBirth: "2001-01-19",
      gender: "FEMALE",
      bloodType: "AB+",
      address: "Yeka Sub-city, Addis Ababa",
      status: "ACTIVE",
      createdAt: "2026-07-20T09:30:00.000Z",
    },
    {
      id: "pat-005",
      email: "selam.teshome@example.com",
      fullName: "Selam Teshome",
      role: "PATIENT",
      phone: "+251 917 220 118",
      dateOfBirth: "1993-08-30",
      gender: "FEMALE",
      bloodType: "O-",
      address: "Kazanchis, Addis Ababa",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "pat-006",
      email: "sara.bekele@example.com",
      fullName: "Sara Bekele",
      role: "PATIENT",
      phone: "+251 913 447 902",
      dateOfBirth: "1993-09-08",
      gender: "FEMALE",
      bloodType: "O-",
      address: "Bahir Dar, Amhara",
      status: "SUSPENDED",
      createdAt: "2026-10-30T10:20:00.000Z",
    },
  ];

  const doctors = [
    {
      id: "doc-001",
      email: "doctor@myhealth.et",
      fullName: "Dr. Selamawit Bekele",
      role: "DOCTOR",
      phone: "+251 911 556 001",
      hospitalId: "hsp-001",
      departmentId: "dep-001",
      specialty: "Cardiology",
      licenseNumber: "ET-MD-10231",
      yearsExperience: 12,
      bio: "Consultant cardiologist focused on hypertension management and preventive heart care.",
      consultationFee: 800,
      rating: 4.8,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "doc-002",
      email: "yonas.tadesse@myhealth.et",
      fullName: "Dr. Yonas Tadesse",
      role: "DOCTOR",
      phone: "+251 911 556 002",
      hospitalId: "hsp-001",
      departmentId: "dep-002",
      specialty: "General Medicine",
      licenseNumber: "ET-MD-10442",
      yearsExperience: 7,
      bio: "General practitioner handling adult primary care, chronic disease follow-up and referrals.",
      consultationFee: 400,
      rating: 4.6,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: "2026-09-05T09:00:00.000Z",
    },
    {
      id: "doc-003",
      email: "meron.haile@myhealth.et",
      fullName: "Dr. Meron Haile",
      role: "DOCTOR",
      phone: "+251 911 556 003",
      hospitalId: "hsp-002",
      departmentId: "dep-004",
      specialty: "Pediatrics",
      licenseNumber: "ET-MD-10987",
      yearsExperience: 9,
      bio: "Pediatrician with a special interest in childhood asthma and nutrition.",
      consultationFee: 500,
      rating: 4.9,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "doc-004",
      email: "bereket.assefa@myhealth.et",
      fullName: "Dr. Bereket Assefa",
      role: "DOCTOR",
      phone: "+251 911 556 004",
      hospitalId: "hsp-002",
      departmentId: "dep-005",
      specialty: "Orthopedics",
      licenseNumber: "ET-MD-10775",
      yearsExperience: 15,
      bio: "Orthopedic surgeon specialising in sports injuries and joint replacement.",
      consultationFee: 900,
      rating: 4.7,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: "2026-08-14T09:00:00.000Z",
    },
    {
      id: "doc-005",
      email: "tigist.alemayehu@myhealth.et",
      fullName: "Dr. Tigist Alemayehu",
      role: "DOCTOR",
      phone: "+251 911 556 005",
      hospitalId: "hsp-003",
      specialty: "Dermatology",
      licenseNumber: "ET-MD-10336",
      yearsExperience: 6,
      bio: "Dermatologist treating chronic skin conditions and cosmetic dermatology.",
      consultationFee: 600,
      rating: 4.5,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "doc-006",
      email: "samuel.gebre@myhealth.et",
      fullName: "Dr. Samuel Gebre",
      role: "DOCTOR",
      phone: "+251 911 556 006",
      hospitalId: "hsp-001",
      departmentId: "dep-003",
      specialty: "Neurology",
      licenseNumber: "ET-MD-10112",
      yearsExperience: 18,
      bio: "Neurologist focused on migraine, epilepsy and stroke rehabilitation.",
      consultationFee: 1000,
      rating: 4.8,
      isAcceptingPatients: true,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: "2026-07-11T09:00:00.000Z",
    },
    {
      id: "doc-007",
      email: "rahel.wondimu@myhealth.et",
      fullName: "Dr. Rahel Wondimu",
      role: "DOCTOR",
      phone: "+251 911 556 007",
      hospitalId: "hsp-002",
      specialty: "Obstetrics & Gynecology",
      licenseNumber: "ET-MD-10654",
      yearsExperience: 11,
      bio: "Obstetrician providing antenatal care and maternal health counselling.",
      consultationFee: 750,
      rating: 4.9,
      isAcceptingPatients: false,
      isActive: true,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "doc-008",
      email: "kalkidan.desta@myhealth.et",
      fullName: "Dr. Kalkidan Desta",
      role: "DOCTOR",
      phone: "+251 911 556 008",
      hospitalId: "hsp-003",
      specialty: "Ophthalmology",
      licenseNumber: "ET-MD-10890",
      yearsExperience: 5,
      bio: "Ophthalmologist handling cataract surgery and refractive error clinics.",
      consultationFee: 550,
      rating: 4.4,
      isAcceptingPatients: false,
      isActive: false,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: "2026-10-22T09:00:00.000Z",
    },
  ];

  const hospitalAdmins = [
    {
      id: "adm-001",
      email: "hospital@myhealth.et",
      fullName: "Hanna Solomon",
      role: "HOSPITAL_ADMIN",
      phone: "+251 911 700 100",
      hospitalId: "hsp-001",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "adm-002",
      email: "getachew.bekele@myhealth.et",
      fullName: "Getachew Bekele",
      role: "HOSPITAL_ADMIN",
      phone: "+251 911 700 200",
      hospitalId: "hsp-002",
      status: "ACTIVE",
      createdAt: "2026-09-22T09:00:00.000Z",
    },
    {
      id: "adm-003",
      email: "meron.tesfaye@myhealth.et",
      fullName: "Meron Tesfaye",
      role: "HOSPITAL_ADMIN",
      phone: "+251 911 700 300",
      hospitalId: "hsp-004",
      status: "PENDING",
      createdAt: "2026-11-02T08:40:00.000Z",
    },
  ];

  const superAdmins = [
    {
      id: "adm-000",
      email: "admin@myhealth.et",
      fullName: "Super Admin",
      role: "SUPER_ADMIN",
      phone: "+251 911 700 000",
      status: "ACTIVE",
      createdAt: seededAt,
    },
  ];

  const users = [...patients, ...doctors, ...hospitalAdmins, ...superAdmins].map((user) => ({
    ...user,
    passwordHash,
  }));

  /* -------------------------------- Hospitals ------------------------------ */

  const capacity = (totalBeds, occupiedBeds, totalDoctors, icuBeds, occupiedIcuBeds) => ({
    totalBeds,
    occupiedBeds,
    totalDoctors,
    icuBeds,
    occupiedIcuBeds,
  });

  const hospitals = [
    {
      id: "hsp-001",
      name: "Addis Care General Hospital",
      city: "Addis Ababa",
      address: "Bole Road, near Meskel Square, Addis Ababa",
      phone: "+251 116 551 200",
      email: "info@addiscare.example.com",
      description:
        "A 220-bed general hospital offering cardiology, neurology and internal medicine services with 24/7 emergency care.",
      specialties: ["Cardiology", "Neurology", "General Medicine"],
      services: ["EMERGENCY", "OUTPATIENT", "INPATIENT", "LABORATORY", "IMAGING", "PHARMACY"],
      rating: 4.7,
      isVerified: true,
      approvalStatus: "APPROVED",
      hospitalType: "GENERAL",
      region: "Addis Ababa",
      website: "https://addiscare.example.com",
      representativeName: "Hanna Solomon",
      representativeEmail: "hospital@myhealth.et",
      representativePhone: "+251 911 700 100",
      submittedAt: "2026-06-12T08:00:00.000Z",
      reviewedAt: "2026-06-20T08:00:00.000Z",
      reviewedBy: "Super Admin",
      capacity: capacity(220, 178, 3, 18, 13),
      operatingHours: {
        opensAt: "07:00",
        closesAt: "21:00",
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        emergencyAvailable: true,
      },
      createdAt: "2026-06-12T08:00:00.000Z",
    },
    {
      id: "hsp-002",
      name: "St. Gabriel Specialty Clinic",
      city: "Addis Ababa",
      address: "Kazanchis, Cape Verde Street, Addis Ababa",
      phone: "+251 116 618 900",
      email: "care@stgabriel.example.com",
      description:
        "Specialty clinic for pediatrics, orthopedics and maternal health with an on-site diagnostic laboratory.",
      specialties: ["Pediatrics", "Orthopedics", "Obstetrics & Gynecology"],
      services: ["OUTPATIENT", "LABORATORY", "PHARMACY"],
      rating: 4.6,
      isVerified: true,
      approvalStatus: "APPROVED",
      hospitalType: "SPECIALTY",
      region: "Addis Ababa",
      representativeName: "Getachew Bekele",
      representativeEmail: "getachew.bekele@myhealth.et",
      submittedAt: "2026-06-28T08:00:00.000Z",
      reviewedAt: "2026-07-05T10:20:00.000Z",
      reviewedBy: "Super Admin",
      capacity: capacity(90, 61, 3, 8, 4),
      operatingHours: {
        opensAt: "08:00",
        closesAt: "18:00",
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
        emergencyAvailable: false,
      },
      createdAt: "2026-06-28T08:00:00.000Z",
    },
    {
      id: "hsp-003",
      name: "Hawassa Referral Medical Center",
      city: "Hawassa",
      address: "Piazza Area, Hawassa, Sidama Region",
      phone: "+251 462 202 330",
      email: "contact@hawassareferral.example.com",
      description:
        "Regional referral center serving Sidama and the southern corridor, with dermatology and eye care clinics.",
      specialties: ["Dermatology", "Ophthalmology", "General Medicine"],
      services: ["EMERGENCY", "OUTPATIENT", "LABORATORY"],
      rating: 4.3,
      isVerified: true,
      approvalStatus: "APPROVED",
      hospitalType: "REFERRAL",
      region: "Sidama",
      representativeName: "Tigist Alemayehu",
      representativeEmail: "tigist@hawassareferral.example.com",
      submittedAt: "2026-07-12T08:00:00.000Z",
      reviewedAt: "2026-07-30T09:40:00.000Z",
      reviewedBy: "Super Admin",
      capacity: capacity(140, 102, 2, 10, 6),
      operatingHours: {
        opensAt: "08:30",
        closesAt: "20:00",
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        emergencyAvailable: true,
      },
      createdAt: "2026-07-12T08:00:00.000Z",
    },
    {
      id: "hsp-004",
      name: "Mekelle Hope Hospital",
      city: "Mekelle",
      address: "Hadnet Sub-city, Mekelle, Tigray",
      phone: "+251 344 401 118",
      email: "admin@mekellehope.example.com",
      description:
        "Newly opened private hospital awaiting platform verification before accepting appointments.",
      specialties: ["General Medicine", "Pediatrics"],
      rating: 0,
      isVerified: false,
      approvalStatus: "PENDING",
      hospitalType: "GENERAL",
      region: "Tigray",
      website: "https://mekellehope.example.com",
      representativeName: "Meron Tesfaye",
      representativeEmail: "meron.tesfaye@myhealth.et",
      representativePhone: "+251 911 700 300",
      submittedAt: "2026-11-02T08:35:00.000Z",
      documents: [
        {
          id: "docm-001",
          name: "Operating licence.pdf",
          type: "LICENSE",
          uploadedAt: "2026-11-02T08:30:00.000Z",
        },
        {
          id: "docm-002",
          name: "Accreditation certificate.pdf",
          type: "ACCREDITATION",
          uploadedAt: "2026-11-02T08:31:00.000Z",
        },
      ],
      capacity: capacity(60, 0, 0, 4, 0),
      createdAt: "2026-11-02T08:35:00.000Z",
    },
    {
      id: "hsp-005",
      name: "Blue Nile Community Clinic",
      city: "Bahir Dar",
      address: "Kebele 05, Bahir Dar, Amhara",
      phone: "+251 582 201 744",
      email: "hello@bluenile.example.com",
      description:
        "Community clinic applying to join MyHealth as a primary care partner in Bahir Dar.",
      specialties: ["General Medicine", "Pediatrics"],
      rating: 0,
      isVerified: false,
      approvalStatus: "REJECTED",
      hospitalType: "CLINIC",
      region: "Amhara",
      representativeName: "Yohannes Alemu",
      representativeEmail: "yohannes@bluenile.example.com",
      representativePhone: "+251 582 201 900",
      submittedAt: "2026-09-20T09:00:00.000Z",
      reviewedAt: "2026-09-24T11:15:00.000Z",
      reviewedBy: "Super Admin",
      rejectionReason:
        "The submitted operating licence expired in August 2026. Upload a renewed licence and resubmit the application.",
      documents: [
        {
          id: "docm-003",
          name: "Operating licence (expired).pdf",
          type: "LICENSE",
          uploadedAt: "2026-09-20T08:52:00.000Z",
        },
      ],
      capacity: capacity(24, 0, 0, 0, 0),
      createdAt: "2026-09-20T09:00:00.000Z",
    },
    {
      id: "hsp-006",
      name: "Dire Dawa Community Hospital",
      city: "Dire Dawa",
      address: "Kefira, Dire Dawa",
      phone: "+251 251 112 807",
      email: "info@diredawacommunity.example.com",
      description:
        "Regional community hospital serving Dire Dawa with general medicine and maternal health services.",
      specialties: ["General Medicine", "Obstetrics & Gynecology"],
      rating: 4.1,
      isVerified: false,
      approvalStatus: "SUSPENDED",
      hospitalType: "GENERAL",
      region: "Dire Dawa",
      representativeName: "Fatuma Ahmed",
      representativeEmail: "fatuma@diredawacommunity.example.com",
      representativePhone: "+251 251 112 900",
      submittedAt: "2026-06-12T07:00:00.000Z",
      reviewedAt: "2026-10-15T13:00:00.000Z",
      reviewedBy: "Super Admin",
      suspensionReason:
        "Temporarily suspended while an infection-control review is completed. Existing records are retained.",
      capacity: capacity(110, 64, 0, 6, 3),
      createdAt: "2026-06-12T07:00:00.000Z",
    },
  ];

  /* ------------------------------- Departments ----------------------------- */

  const departments = [
    {
      id: "dep-001",
      hospitalId: "hsp-001",
      name: "Cardiology Department",
      description:
        "Consultant cardiology clinic covering hypertension, heart failure follow-up and preventive cardiac care.",
      specialty: "Cardiology",
      contactPhone: "+251 116 551 210",
      contactEmail: "cardiology@addiscare.example.com",
      location: "Second floor, Block B",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "dep-002",
      hospitalId: "hsp-001",
      name: "General Medicine",
      description:
        "Adult primary care, chronic disease follow-up and internal medicine referrals.",
      specialty: "General Medicine",
      contactPhone: "+251 116 551 211",
      location: "Ground floor, Block A",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "dep-003",
      hospitalId: "hsp-001",
      name: "Neurology Department",
      description: "Neurology clinic for migraine, epilepsy and post-stroke rehabilitation.",
      specialty: "Neurology",
      contactPhone: "+251 116 551 214",
      location: "Third floor, Block C",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "dep-004",
      hospitalId: "hsp-002",
      name: "Pediatrics Department",
      description:
        "Child health clinic for growth monitoring, childhood asthma and immunisation review.",
      specialty: "Pediatrics",
      contactPhone: "+251 116 618 910",
      location: "First floor, Children's Wing",
      status: "ACTIVE",
      createdAt: seededAt,
    },
    {
      id: "dep-005",
      hospitalId: "hsp-002",
      name: "Orthopedics Unit",
      description: "Fracture clinic, sports injury assessment and joint replacement follow-up.",
      specialty: "Orthopedics",
      contactPhone: "+251 116 618 915",
      location: "Ground floor, Block D",
      status: "INACTIVE",
      createdAt: seededAt,
    },
  ];

  /* ------------------------------- Appointments ---------------------------- */

  const appointmentRows = [
    ["apt-001", "pat-001", "doc-001", "hsp-001", daysFromNow(2), "09:00", "09:30", "BOOKED", "Follow-up on blood pressure medication and recurring headaches."],
    ["apt-002", "pat-002", "doc-003", "hsp-002", daysFromNow(4), "11:00", "11:30", "BOOKED", "Child has a persistent cough and mild fever for five days."],
    ["apt-003", "pat-001", "doc-005", "hsp-003", daysFromNow(-14), "14:00", "14:30", "COMPLETED", "Recurring skin rash on both arms."],
    ["apt-004", "pat-003", "doc-002", "hsp-001", daysFromNow(-5), "10:30", "11:00", "CANCELLED", "General wellness check-up."],
    ["apt-005", "pat-004", "doc-007", "hsp-002", daysFromNow(1), "15:30", "16:00", "BOOKED", "Antenatal consultation, first trimester."],
    ["apt-006", "pat-002", "doc-001", "hsp-001", daysFromNow(0), "08:30", "09:00", "BOOKED", "Chest tightness during exercise."],
    ["apt-007", "pat-005", "doc-006", "hsp-001", daysFromNow(0), "13:00", "13:30", "BOOKED", "Frequent migraines with visual aura."],
    ["apt-008", "pat-003", "doc-002", "hsp-001", daysFromNow(-30), "09:30", "10:00", "COMPLETED", "Vitamin D deficiency follow-up."],
  ];

  const appointments = appointmentRows.map(
    ([id, patientId, doctorId, hospitalId, date, startTime, endTime, status, reason]) => ({
      id,
      patientId,
      doctorId,
      hospitalId,
      date,
      startTime,
      endTime,
      status,
      reason,
      paymentId: `pay-${id.slice(-3)}`,
      createdAt: seededAt,
      updatedAt: seededAt,
    }),
  );

  /* --------------------------------- Payments ------------------------------ */

  const paymentRows = [
    ["pay-001", "apt-001", "pat-001", 800, "ONLINE", "PAID", "MH-TXN-100001"],
    ["pay-002", "apt-002", "pat-002", 500, "PAY_AT_HOSPITAL", "UNPAID_AT_HOSPITAL", null],
    ["pay-003", "apt-003", "pat-001", 600, "ONLINE", "PAID", "MH-TXN-100003"],
    ["pay-004", "apt-004", "pat-003", 400, "PAY_AT_HOSPITAL", "UNPAID_AT_HOSPITAL", null],
    ["pay-005", "apt-005", "pat-004", 750, "ONLINE", "PENDING", "MH-TXN-100005"],
    ["pay-006", "apt-006", "pat-002", 800, "ONLINE", "PAID", "MH-TXN-100006"],
    ["pay-007", "apt-007", "pat-005", 1000, "ONLINE", "FAILED", "MH-TXN-100007"],
    ["pay-008", "apt-008", "pat-003", 400, "PAY_AT_HOSPITAL", "PAID", null],
  ];

  const payments = paymentRows.map(
    ([id, appointmentId, patientId, amount, method, status, transactionRef]) => ({
      id,
      appointmentId,
      patientId,
      amount,
      currency: "ETB",
      method,
      status,
      transactionRef: transactionRef ?? undefined,
      createdAt: seededAt,
      paidAt: status === "PAID" ? seededAt : undefined,
    }),
  );

  /* ------------------------------- Availability ---------------------------- */

  const availability = [
    ["avl-001", "doc-001", "hsp-001", "MONDAY", "09:00", "16:00"],
    ["avl-002", "doc-001", "hsp-001", "WEDNESDAY", "09:00", "16:00"],
    ["avl-003", "doc-002", "hsp-001", "TUESDAY", "09:00", "15:00"],
    ["avl-004", "doc-003", "hsp-002", "MONDAY", "09:00", "16:00"],
    ["avl-005", "doc-006", "hsp-001", "TUESDAY", "10:00", "17:00"],
    ["avl-006", "doc-007", "hsp-002", "MONDAY", "09:00", "14:00"],
  ].map(([id, doctorId, hospitalId, dayOfWeek, startTime, endTime]) => ({
    id,
    doctorId,
    hospitalId,
    dayOfWeek,
    startTime,
    endTime,
    slotDurationMinutes: 30,
    isActive: true,
  }));

  /* ------------------------------- Notifications --------------------------- */

  const notifications = [
    {
      id: "ntf-001",
      userId: "pat-001",
      title: "Appointment confirmed",
      message: "Your cardiology appointment with Dr. Selamawit Bekele is confirmed.",
      type: "APPOINTMENT",
      isRead: false,
      createdAt: seededAt,
      link: "/patient/appointments",
    },
    {
      id: "ntf-002",
      userId: "doc-001",
      title: "New appointment booked",
      message: "Abebe Tesfaye booked a follow-up consultation.",
      type: "APPOINTMENT",
      isRead: false,
      createdAt: seededAt,
      link: "/doctor/appointments",
    },
    {
      id: "ntf-003",
      userId: "adm-001",
      title: "Capacity nearing threshold",
      message: "Addis Care is at 81% bed occupancy. Review capacity planning.",
      type: "SYSTEM",
      isRead: false,
      createdAt: seededAt,
      link: "/hospital-admin/profile",
    },
    {
      id: "ntf-004",
      userId: "adm-001",
      title: "Payment received",
      message: "800 ETB was paid online for appointment apt-006.",
      type: "PAYMENT",
      isRead: false,
      createdAt: seededAt,
      link: "/hospital-admin/payments",
    },
    {
      id: "ntf-005",
      userId: "adm-000",
      title: "Hospital approval pending",
      message: "Mekelle Hope Hospital submitted a verification request.",
      type: "APPROVAL",
      isRead: false,
      createdAt: seededAt,
      link: "/admin/hospitals/pending",
    },
    ...[
      ["ntf-006", "New hospital application", "Mekelle Hope Hospital submitted verification documents for review.", "2026-11-02T08:36:00.000Z", "/admin/hospitals/pending", false],
      ["ntf-007", "Hospital application rejected", "Blue Nile Community Clinic was rejected because its operating licence expired.", "2026-09-24T11:15:00.000Z", "/admin/hospitals/hsp-005", true],
      ["ntf-008", "Hospital suspended", "Dire Dawa Community Hospital was suspended pending an infection-control review.", "2026-10-15T13:00:00.000Z", "/admin/hospitals/hsp-006", true],
      ["ntf-009", "Administrator account created", "Meron Tesfaye was invited to administer Mekelle Hope Hospital.", "2026-11-02T08:41:00.000Z", "/admin/administrators", false],
      ["ntf-010", "Weekly platform summary ready", "Appointment volume and hospital activity for last week are available in analytics.", "2026-11-09T06:00:00.000Z", "/admin/analytics", true],
      ["ntf-011", "Patient account suspended", "Sara Bekele's account was suspended after repeated no-show reports.", "2026-10-30T10:25:00.000Z", "/admin/users/pat-006", true],
      ["ntf-012", "Platform settings updated", "Session policy and hospital verification requirements were reviewed.", "2026-10-01T08:10:00.000Z", "/admin/settings", true],
      ["ntf-013", "Doctor verification required", "Dr. Kalkidan Desta's professional details are awaiting verification.", "2026-11-05T09:20:00.000Z", "/admin/doctors", false],
      ["ntf-014", "New sign-in detected", "A Super Administrator session started from a new device. Review the audit log.", "2026-11-08T19:40:00.000Z", "/admin/activity", true],
    ].map(([id, title, message, createdAt, link, isRead]) => ({
      id,
      userId: "adm-000",
      title,
      message,
      type: "SYSTEM",
      isRead,
      createdAt,
      link,
    })),
  ];

  /* ------------------------------ Medical records -------------------------- */

  const medicalRecords = [
    {
      id: "mrec-001",
      patientId: "pat-001",
      doctorId: "doc-005",
      hospitalId: "hsp-003",
      appointmentId: "apt-003",
      diagnosis: "Contact dermatitis, likely detergent related.",
      treatment: "Topical corticosteroid course for 14 days.",
      prescription: [
        "Hydrocortisone 1% cream — apply twice daily",
        "Cetirizine 10mg — nightly",
      ],
      notes: "Advised to switch to fragrance-free detergent. Review if rash persists.",
      recordedAt: seededAt,
    },
    {
      id: "mrec-002",
      patientId: "pat-003",
      doctorId: "doc-002",
      hospitalId: "hsp-001",
      appointmentId: "apt-008",
      diagnosis: "Vitamin D deficiency.",
      treatment: "Oral supplementation and diet review.",
      prescription: ["Cholecalciferol 2000 IU — daily for 8 weeks"],
      notes: "Repeat blood panel in two months.",
      recordedAt: "2026-08-18T09:15:00.000Z",
    },
  ];

  /* --------------------------------- Audit log ---------------------------- */

  const audit = (id, action, entityId, entityLabel, description, createdAt, metadata) => ({
    id,
    action,
    entityType: "HOSPITAL",
    entityId,
    entityLabel,
    description,
    actorId: "adm-000",
    actorName: "Super Admin",
    result: "SUCCESS",
    createdAt,
    metadata,
  });

  const auditLogs = [
    audit("aud-010", "ADMINISTRATOR_INVITED", "adm-003", "Meron Tesfaye", "Administrator invited to Mekelle Hope Hospital.", "2026-11-02T08:41:00.000Z", { hospital: "Mekelle Hope Hospital" }),
    audit("aud-009", "HOSPITAL_REGISTERED", "hsp-004", "Mekelle Hope Hospital", "New hospital application submitted for verification.", "2026-11-02T08:35:00.000Z"),
    audit("aud-008", "HOSPITAL_SUSPENDED", "hsp-006", "Dire Dawa Community Hospital", "Hospital suspended pending an infection-control review; records retained.", "2026-10-15T13:00:00.000Z"),
    audit("aud-007", "USER_STATUS_CHANGED", "pat-006", "Sara Bekele", "Account status changed from ACTIVE to SUSPENDED.", "2026-10-30T10:25:00.000Z", { from: "ACTIVE", to: "SUSPENDED", reason: "Repeated no-show reports." }),
    audit("aud-006", "SETTINGS_UPDATED", "platform", "Platform settings", "Session policy and hospital verification requirements reviewed.", "2026-10-01T08:10:00.000Z"),
    audit("aud-005", "HOSPITAL_REJECTED", "hsp-005", "Blue Nile Community Clinic", "Hospital application rejected: expired operating licence.", "2026-09-24T11:15:00.000Z"),
    audit("aud-004", "HOSPITAL_REGISTERED", "hsp-005", "Blue Nile Community Clinic", "New hospital application submitted for verification.", "2026-09-20T09:00:00.000Z"),
    audit("aud-003", "HOSPITAL_APPROVED", "hsp-003", "Hawassa Referral Medical Center", "Hospital application approved.", "2026-07-30T09:40:00.000Z"),
    audit("aud-002", "HOSPITAL_APPROVED", "hsp-002", "St. Gabriel Specialty Clinic", "Hospital application approved.", "2026-07-05T10:20:00.000Z"),
    audit("aud-001", "HOSPITAL_APPROVED", "hsp-001", "Addis Care General Hospital", "Hospital application approved.", "2026-06-20T08:00:00.000Z"),
  ];

  /* ------------------------------ Platform settings ------------------------ */

  const settings = {
    platformName: "MyHealth",
    platformDescription:
      "AI-assisted healthcare navigation and appointment coordination for Ethiopian hospitals and clinics.",
    supportEmail: "support@myhealth.et",
    supportPhone: "+251 116 000 000",
    patientRegistrationEnabled: true,
    hospitalRegistrationEnabled: true,
    requireHospitalVerificationDocuments: true,
    regions: ["Addis Ababa", "Amhara", "Dire Dawa", "Oromia", "Sidama", "Tigray"],
    hospitalTypes: ["GENERAL", "SPECIALTY", "REFERRAL", "CLINIC"],
    specialties: [
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
    ],
    sessionTimeoutMinutes: 480,
    requireStrongPasswords: true,
    adminSessionNote:
      "Super Administrator sessions are limited to eight hours. Every administrative action is recorded in the audit log.",
    updatedAt: "2026-10-01T08:10:00.000Z",
    updatedBy: "Super Admin",
  };

  return {
    users,
    hospitals,
    departments,
    appointments,
    payments,
    availability,
    notifications,
    medicalRecords,
    recommendations: [],
    auditLogs,
    passwordResets: [],
    settings,
  };
}
