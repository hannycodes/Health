import express from "express";

import { db, nextId, saveDb } from "../db.js";
import {
  HttpError,
  checkPassword,
  publicUser,
  requireRole,
  signToken,
} from "../auth.js";
import {
  assert,
  getDoctor,
  getHospital,
  getUser,
  notifyHospitalAdmins,
  pushNotification,
  requireHospitalScope,
  scopedHospitalId,
  SPECIALTIES,
  TIME_PATTERN,
  WEEKDAYS,
} from "../helpers.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uniqueEmail(email, ignoreId) {
  assert(EMAIL_PATTERN.test(email), 422, "Enter a valid email address.");
  const clash = db.users.some(
    (user) => user.id !== ignoreId && user.email.toLowerCase() === email.toLowerCase(),
  );
  assert(!clash, 409, "A MyHealth account already uses that email address.");
}

export function directoryRoutes(auth) {
  const router = express.Router();

  /* ---------------------------------------------------------------------- */
  /*                            Auth (public part)                          */
  /* ---------------------------------------------------------------------- */

  router.post("/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    assert(
      typeof email === "string" && typeof password === "string",
      422,
      "Email and password are required.",
    );

    const user = db.users.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );

    if (!user || !user.passwordHash || !checkPassword(password, user.passwordHash)) {
      throw new HttpError(401, "Invalid email or password.");
    }

    res.json({
      user: publicUser(user),
      token: signToken(user),
      hospitalId: user.hospitalId,
    });
  });

  router.use(auth);

  router.post("/auth/logout", (_req, res) => res.status(204).end());

  router.get("/auth/me", (req, res) => res.json(publicUser(req.user)));

  /* ---------------------------------------------------------------------- */
  /*                                Hospitals                               */
  /* ---------------------------------------------------------------------- */

  router.get("/hospitals", (req, res) => {
    const { approvalStatus, city, search } = req.query;
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";

    let rows = db.hospitals;
    if (req.user.role === "HOSPITAL_ADMIN") {
      rows = rows.filter((hospital) => hospital.id === req.user.hospitalId);
    }

    rows = rows.filter((hospital) => {
      if (approvalStatus && hospital.approvalStatus !== approvalStatus) return false;
      if (city && hospital.city !== city) return false;
      if (
        term &&
        !`${hospital.name} ${hospital.city} ${hospital.specialties.join(" ")}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }
      return true;
    });

    res.json(rows);
  });

  router.get("/hospitals/:id", (req, res) => {
    const hospital = getHospital(req.params.id);
    assert(hospital, 404, "Hospital not found.");
    requireHospitalScope(req.user, hospital.id);
    res.json(hospital);
  });

  router.patch(
    "/hospitals/:id",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const hospital = getHospital(req.params.id);
      assert(hospital, 404, "Hospital not found.");
      requireHospitalScope(req.user, hospital.id);

      const {
        approvalStatus: _approvalStatus,
        isVerified: _isVerified,
        id: _id,
        ...patch
      } = req.body ?? {};
      Object.assign(hospital, patch);
      saveDb();
      res.json(hospital);
    },
  );

  router.patch("/hospitals/:id/approval", requireRole("SUPER_ADMIN"), (req, res) => {
    const hospital = getHospital(req.params.id);
    assert(hospital, 404, "Hospital not found.");
    const { status } = req.body ?? {};
    assert(
      ["PENDING", "APPROVED", "REJECTED"].includes(status),
      422,
      "Status must be PENDING, APPROVED or REJECTED.",
    );

    hospital.approvalStatus = status;
    hospital.isVerified = status === "APPROVED";

    db.users
      .filter((user) => user.role === "HOSPITAL_ADMIN" && user.hospitalId === hospital.id)
      .forEach((admin) => {
        pushNotification({
          userId: admin.id,
          title: `Hospital ${status.toLowerCase()}`,
          message: `${hospital.name} was ${status.toLowerCase()} by the platform team.`,
          type: "APPROVAL",
          link: "/hospital-admin/profile",
        });
      });

    saveDb();
    res.json(hospital);
  });

  router.patch(
    "/hospitals/:id/capacity",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const hospital = getHospital(req.params.id);
      assert(hospital, 404, "Hospital not found.");
      requireHospitalScope(req.user, hospital.id);

      hospital.capacity = { ...hospital.capacity, ...(req.body ?? {}) };
      saveDb();
      res.json(hospital);
    },
  );

  /* ---------------------------------------------------------------------- */
  /*                               Departments                              */
  /* ---------------------------------------------------------------------- */

  router.get("/departments", (req, res) => {
    const { specialty, status, search } = req.query;
    const hospitalId = scopedHospitalId(req.user, req.query.hospitalId);
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";

    const rows = db.departments
      .filter((department) => {
        if (hospitalId && department.hospitalId !== hospitalId) return false;
        if (specialty && department.specialty !== specialty) return false;
        if (status && department.status !== status) return false;
        if (
          term &&
          !`${department.name} ${department.description} ${department.specialty}`
            .toLowerCase()
            .includes(term)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(rows);
  });

  router.get("/departments/:id", (req, res) => {
    const department = db.departments.find((item) => item.id === req.params.id);
    assert(department, 404, "Department not found.");
    requireHospitalScope(req.user, department.hospitalId);
    res.json(department);
  });

  router.post(
    "/departments",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const body = req.body ?? {};
      const hospitalId = scopedHospitalId(req.user, body.hospitalId);
      assert(hospitalId, 422, "A hospital is required.");
      const hospital = getHospital(hospitalId);
      assert(hospital, 404, "Hospital not found.");

      assert(
        typeof body.name === "string" && body.name.trim().length >= 2,
        422,
        "Enter a department name of at least 2 characters.",
      );
      assert(
        SPECIALTIES.includes(body.specialty),
        422,
        "Choose a valid specialty for the department.",
      );
      assert(
        typeof body.description === "string" && body.description.trim().length >= 20,
        422,
        "Describe the department in at least 20 characters.",
      );

      const duplicate = db.departments.some(
        (department) =>
          department.hospitalId === hospitalId &&
          department.name.trim().toLowerCase() === body.name.trim().toLowerCase(),
      );
      assert(
        !duplicate,
        409,
        "A department with that name already exists in this hospital.",
      );

      const department = {
        id: nextId("dep"),
        hospitalId,
        name: body.name.trim(),
        description: body.description.trim(),
        specialty: body.specialty,
        contactPhone: body.contactPhone?.trim() || undefined,
        contactEmail: body.contactEmail?.trim() || undefined,
        location: body.location?.trim() || undefined,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };

      db.departments = [department, ...db.departments];
      notifyHospitalAdmins(
        hospitalId,
        "Department created",
        `${department.name} was added to ${hospital.name}.`,
        "/hospital-admin/departments",
      );
      saveDb();
      res.status(201).json(department);
    },
  );

  router.patch(
    "/departments/:id",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const department = db.departments.find((item) => item.id === req.params.id);
      assert(department, 404, "Department not found.");
      requireHospitalScope(req.user, department.hospitalId);

      const body = req.body ?? {};
      if (body.name) {
        const duplicate = db.departments.some(
          (item) =>
            item.id !== department.id &&
            item.hospitalId === department.hospitalId &&
            item.name.trim().toLowerCase() === String(body.name).trim().toLowerCase(),
        );
        assert(
          !duplicate,
          409,
          "A department with that name already exists in this hospital.",
        );
      }

      const allowed = [
        "name",
        "description",
        "specialty",
        "contactPhone",
        "contactEmail",
        "location",
      ];
      allowed.forEach((key) => {
        if (body[key] !== undefined) department[key] = body[key];
      });

      saveDb();
      res.json(department);
    },
  );

  router.patch(
    "/departments/:id/status",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const department = db.departments.find((item) => item.id === req.params.id);
      assert(department, 404, "Department not found.");
      requireHospitalScope(req.user, department.hospitalId);

      const { status } = req.body ?? {};
      assert(
        ["ACTIVE", "INACTIVE"].includes(status),
        422,
        "Status must be ACTIVE or INACTIVE.",
      );

      department.status = status;
      saveDb();
      res.json(department);
    },
  );

  /* ---------------------------------------------------------------------- */
  /*                                 Doctors                                */
  /* ---------------------------------------------------------------------- */

  router.get("/doctors", (req, res) => {
    const { specialty, search } = req.query;
    const hospitalId = scopedHospitalId(req.user, req.query.hospitalId);
    const acceptingOnly =
      req.query.acceptingOnly === "true" || req.query.acceptingOnly === true;
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";

    const rows = db.users
      .filter((user) => user.role === "DOCTOR")
      .filter((doctor) => {
        if (hospitalId && doctor.hospitalId !== hospitalId) return false;
        if (specialty && doctor.specialty !== specialty) return false;
        if (acceptingOnly && !doctor.isAcceptingPatients) return false;
        if (
          term &&
          !`${doctor.fullName} ${doctor.specialty} ${doctor.email}`
            .toLowerCase()
            .includes(term)
        ) {
          return false;
        }
        return true;
      })
      .map(publicUser);

    res.json(rows);
  });

  router.get("/doctors/me", requireRole("DOCTOR"), (req, res) => {
    res.json(publicUser(req.user));
  });

  router.get("/doctors/:id", (req, res) => {
    const doctor = getDoctor(req.params.id);
    assert(doctor, 404, "Doctor not found.");
    requireHospitalScope(req.user, doctor.hospitalId);
    res.json(publicUser(doctor));
  });

  router.post(
    "/doctors",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const body = req.body ?? {};
      const hospitalId = scopedHospitalId(req.user, body.hospitalId);
      assert(hospitalId, 422, "A hospital is required.");
      const hospital = getHospital(hospitalId);
      assert(hospital, 404, "Hospital not found.");

      assert(
        typeof body.fullName === "string" && body.fullName.trim().length >= 3,
        422,
        "Enter the doctor's full name.",
      );
      uniqueEmail(body.email);
      assert(
        SPECIALTIES.includes(body.specialty),
        422,
        "Choose a valid specialty.",
      );
      assert(
        typeof body.licenseNumber === "string" && body.licenseNumber.trim().length >= 4,
        422,
        "Enter the professional licence number.",
      );
      assert(
        typeof body.bio === "string" && body.bio.trim().length >= 20,
        422,
        "Write a short professional biography of 20+ characters.",
      );
      assert(
        Number.isFinite(Number(body.yearsExperience)) && Number(body.yearsExperience) >= 0,
        422,
        "Enter valid years of experience.",
      );
      assert(
        Number.isFinite(Number(body.consultationFee)) && Number(body.consultationFee) >= 0,
        422,
        "Enter a valid consultation fee.",
      );

      if (body.departmentId) {
        const department = db.departments.find((item) => item.id === body.departmentId);
        assert(department, 404, "Department not found.");
        assert(
          department.hospitalId === hospitalId,
          403,
          "That department belongs to another hospital.",
        );
      }

      const doctor = {
        id: nextId("doc"),
        email: String(body.email).trim(),
        fullName: String(body.fullName).trim(),
        role: "DOCTOR",
        phone: body.phone?.trim() || undefined,
        hospitalId,
        departmentId: body.departmentId || undefined,
        specialty: body.specialty,
        licenseNumber: String(body.licenseNumber).trim(),
        yearsExperience: Number(body.yearsExperience),
        bio: String(body.bio).trim(),
        consultationFee: Number(body.consultationFee),
        rating: 0,
        isAcceptingPatients: true,
        isActive: true,
        accountStatus: "PENDING_INVITATION",
        // No credentials until the doctor accepts the invitation.
        passwordHash: null,
        createdAt: new Date().toISOString(),
      };

      db.users = [doctor, ...db.users];
      notifyHospitalAdmins(
        hospitalId,
        "Doctor registered",
        `${doctor.fullName} was registered for ${hospital.name}. An invitation is pending.`,
        `/hospital-admin/doctors/${doctor.id}`,
      );
      saveDb();
      res.status(201).json(publicUser(doctor));
    },
  );

  router.patch(
    "/doctors/:id",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN", "DOCTOR"),
    (req, res) => {
      const doctor = getDoctor(req.params.id);
      assert(doctor, 404, "Doctor not found.");

      const isSelf = req.user.role === "DOCTOR" && req.user.id === doctor.id;
      if (!isSelf) requireHospitalScope(req.user, doctor.hospitalId);
      assert(
        isSelf || req.user.role === "HOSPITAL_ADMIN" || req.user.role === "SUPER_ADMIN",
        403,
        "You do not have permission to update this doctor.",
      );

      const body = req.body ?? {};
      const adminFields = [
        "fullName",
        "phone",
        "specialty",
        "departmentId",
        "yearsExperience",
        "bio",
        "consultationFee",
        "isAcceptingPatients",
      ];
      const selfFields = ["phone", "bio", "consultationFee", "isAcceptingPatients"];
      const allowed = isSelf ? selfFields : adminFields;

      if (body.departmentId && !isSelf) {
        const department = db.departments.find((item) => item.id === body.departmentId);
        assert(department, 404, "Department not found.");
        assert(
          department.hospitalId === doctor.hospitalId,
          403,
          "That department belongs to another hospital.",
        );
      }

      allowed.forEach((key) => {
        if (body[key] !== undefined) doctor[key] = body[key];
      });

      saveDb();
      res.json(publicUser(doctor));
    },
  );

  router.patch(
    "/doctors/:id/activation",
    requireRole("HOSPITAL_ADMIN", "SUPER_ADMIN"),
    (req, res) => {
      const doctor = getDoctor(req.params.id);
      assert(doctor, 404, "Doctor not found.");
      requireHospitalScope(req.user, doctor.hospitalId);

      const active = req.body?.active;
      assert(typeof active === "boolean", 422, "Provide active: true or false.");

      doctor.isActive = active;
      if (!active) doctor.isAcceptingPatients = false;

      saveDb();
      res.json(publicUser(doctor));
    },
  );

  /* ---------------------------------------------------------------------- */
  /*                              Availability                              */
  /* ---------------------------------------------------------------------- */

  router.get("/doctors/:id/availability", (req, res) => {
    const doctor = getDoctor(req.params.id);
    assert(doctor, 404, "Doctor not found.");
    requireHospitalScope(req.user, doctor.hospitalId);

    res.json(db.availability.filter((slot) => slot.doctorId === doctor.id));
  });

  router.post("/availability", requireRole("DOCTOR", "HOSPITAL_ADMIN"), (req, res) => {
    const body = req.body ?? {};
    const doctor = getDoctor(body.doctorId ?? req.user.id);
    assert(doctor, 404, "Doctor not found.");

    const isSelf = req.user.role === "DOCTOR" && req.user.id === doctor.id;
    if (!isSelf) requireHospitalScope(req.user, doctor.hospitalId);

    assert(WEEKDAYS.includes(body.dayOfWeek), 422, "Choose a valid weekday.");
    assert(TIME_PATTERN.test(body.startTime ?? ""), 422, "Start time must be HH:mm.");
    assert(TIME_PATTERN.test(body.endTime ?? ""), 422, "End time must be HH:mm.");
    assert(body.startTime < body.endTime, 422, "End time must be after the start time.");

    const slot = {
      id: nextId("avl"),
      doctorId: doctor.id,
      hospitalId: doctor.hospitalId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDurationMinutes: Number(body.slotDurationMinutes) || 30,
      isActive: body.isActive !== false,
    };

    db.availability = [...db.availability, slot];
    saveDb();
    res.status(201).json(slot);
  });

  router.patch(
    "/availability/:id",
    requireRole("DOCTOR", "HOSPITAL_ADMIN"),
    (req, res) => {
      const slot = db.availability.find((item) => item.id === req.params.id);
      assert(slot, 404, "Availability slot not found.");

      const isSelf = req.user.role === "DOCTOR" && req.user.id === slot.doctorId;
      if (!isSelf) requireHospitalScope(req.user, slot.hospitalId);

      const body = req.body ?? {};
      if (body.startTime) assert(TIME_PATTERN.test(body.startTime), 422, "Invalid start time.");
      if (body.endTime) assert(TIME_PATTERN.test(body.endTime), 422, "Invalid end time.");
      if (body.dayOfWeek) assert(WEEKDAYS.includes(body.dayOfWeek), 422, "Invalid weekday.");

      ["dayOfWeek", "startTime", "endTime", "slotDurationMinutes", "isActive"].forEach(
        (key) => {
          if (body[key] !== undefined) slot[key] = body[key];
        },
      );

      saveDb();
      res.json(slot);
    },
  );

  router.delete(
    "/availability/:id",
    requireRole("DOCTOR", "HOSPITAL_ADMIN"),
    (req, res) => {
      const slot = db.availability.find((item) => item.id === req.params.id);
      assert(slot, 404, "Availability slot not found.");

      const isSelf = req.user.role === "DOCTOR" && req.user.id === slot.doctorId;
      if (!isSelf) requireHospitalScope(req.user, slot.hospitalId);

      db.availability = db.availability.filter((item) => item.id !== slot.id);
      saveDb();
      res.status(204).end();
    },
  );

  /* ---------------------------------------------------------------------- */
  /*                                 Patients                               */
  /* ---------------------------------------------------------------------- */

  router.get("/patients/me", (req, res) => {
    const patient =
      req.user.role === "PATIENT"
        ? req.user
        : db.users.find(
            (user) => user.role === "PATIENT" && user.id === req.query.userId,
          );

    assert(patient, 404, "Patient profile not found.");
    res.json(publicUser(patient));
  });

  router.get("/patients", requireRole("DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"), (req, res) => {
    const patientIds = new Set(
      db.appointments
        .filter((appointment) => {
          if (req.user.role === "DOCTOR") return appointment.doctorId === req.user.id;
          if (req.user.role === "HOSPITAL_ADMIN") {
            return appointment.hospitalId === req.user.hospitalId;
          }
          return true;
        })
        .map((appointment) => appointment.patientId),
    );

    const rows = db.users
      .filter(
        (user) =>
          user.role === "PATIENT" &&
          (req.user.role === "SUPER_ADMIN" || patientIds.has(user.id)),
      )
      .map(publicUser);

    res.json(rows);
  });

  router.get("/patients/:id", (req, res) => {
    const patient = db.users.find(
      (user) => user.role === "PATIENT" && user.id === req.params.id,
    );
    assert(patient, 404, "Patient profile not found.");

    if (req.user.role === "PATIENT") {
      assert(req.user.id === patient.id, 403, "You can only view your own profile.");
    } else if (req.user.role === "DOCTOR") {
      const sharesAppointment = db.appointments.some(
        (appointment) =>
          appointment.patientId === patient.id && appointment.doctorId === req.user.id,
      );
      assert(sharesAppointment, 403, "This patient is not in your care.");
    } else if (req.user.role === "HOSPITAL_ADMIN") {
      const visitedHospital = db.appointments.some(
        (appointment) =>
          appointment.patientId === patient.id &&
          appointment.hospitalId === req.user.hospitalId,
      );
      assert(visitedHospital, 403, "This patient is not linked to your hospital.");
    }

    res.json(publicUser(patient));
  });

  router.patch("/patients/:id", (req, res) => {
    const patient = db.users.find(
      (user) => user.role === "PATIENT" && user.id === req.params.id,
    );
    assert(patient, 404, "Patient profile not found.");
    assert(req.user.id === patient.id, 403, "You can only update your own profile.");

    const allowed = [
      "fullName",
      "phone",
      "address",
      "emergencyContact",
      "bloodType",
      "dateOfBirth",
      "gender",
    ];
    const body = req.body ?? {};
    allowed.forEach((key) => {
      if (body[key] !== undefined) patient[key] = body[key];
    });

    saveDb();
    res.json(publicUser(patient));
  });

  return router;
}
