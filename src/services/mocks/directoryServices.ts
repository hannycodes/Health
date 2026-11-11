import { ApiError } from "@/lib/http";
import type {
  Doctor,
  DoctorAvailability,
  Hospital,
  HospitalApprovalStatus,
  HospitalCapacity,
  Notification,
  Patient,
} from "@/types";
import type {
  DoctorFilter,
  DoctorService,
  HospitalFilter,
  HospitalService,
  NotificationService,
  PatientService,
} from "@/services/interfaces";
import { pushNotification } from "./notifications";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

/* -------------------------------------------------------------------------- */
/*                                  Patients                                  */
/* -------------------------------------------------------------------------- */

export class MockPatientService implements PatientService {
  list(): Promise<Patient[]> {
    return respond(() => demoDb.get().patients.map((patient) => ({ ...patient })));
  }

  getById(id: string): Promise<Patient | null> {
    return respond(() => {
      const patient = demoDb.get().patients.find((item) => item.id === id);
      return patient ? { ...patient } : null;
    });
  }

  getByUserId(userId: string): Promise<Patient | null> {
    return respond(() => {
      const patient = demoDb.get().patients.find((item) => item.id === userId);
      return patient ? { ...patient } : null;
    });
  }

  update(id: string, patch: Partial<Patient>): Promise<Patient> {
    return respond(() => {
      let updated: Patient | undefined;
      demoDb.mutate((db) => {
        const patient = db.patients.find((item) => item.id === id);
        if (!patient) {
          throw new ApiError({ status: 404, message: "Patient profile not found." });
        }
        Object.assign(patient, patch);
        updated = { ...patient };
      });
      return updated as Patient;
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Doctors                                   */
/* -------------------------------------------------------------------------- */

export class MockDoctorService implements DoctorService {
  list(filter?: DoctorFilter): Promise<Doctor[]> {
    return respond(() => {
      const search = filter?.search?.trim().toLowerCase();

      return demoDb
        .get()
        .doctors.filter((doctor) => {
          if (filter?.hospitalId && doctor.hospitalId !== filter.hospitalId) {
            return false;
          }
          if (filter?.specialty && doctor.specialty !== filter.specialty) {
            return false;
          }
          if (filter?.acceptingOnly && !doctor.isAcceptingPatients) {
            return false;
          }
          if (
            search &&
            !`${doctor.fullName} ${doctor.specialty}`.toLowerCase().includes(search)
          ) {
            return false;
          }
          return true;
        })
        .map((doctor) => ({ ...doctor }));
    });
  }

  getById(id: string): Promise<Doctor | null> {
    return respond(() => {
      const doctor = demoDb.get().doctors.find((item) => item.id === id);
      return doctor ? { ...doctor } : null;
    });
  }

  getByUserId(userId: string): Promise<Doctor | null> {
    return respond(() => {
      const doctor = demoDb.get().doctors.find((item) => item.id === userId);
      return doctor ? { ...doctor } : null;
    });
  }

  update(id: string, patch: Partial<Doctor>): Promise<Doctor> {
    return respond(() => {
      let updated: Doctor | undefined;
      demoDb.mutate((db) => {
        const doctor = db.doctors.find((item) => item.id === id);
        if (!doctor) {
          throw new ApiError({ status: 404, message: "Doctor not found." });
        }
        Object.assign(doctor, patch);
        updated = { ...doctor };
      });
      return updated as Doctor;
    });
  }

  listAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    return respond(() =>
      demoDb
        .get()
        .availability.filter((slot) => slot.doctorId === doctorId)
        .map((slot) => ({ ...slot })),
    );
  }

  saveAvailability(
    input: Omit<DoctorAvailability, "id"> & { id?: string },
  ): Promise<DoctorAvailability> {
    return respond(() => {
      let saved: DoctorAvailability | undefined;

      demoDb.mutate((db) => {
        if (input.id) {
          const existing = db.availability.find((slot) => slot.id === input.id);
          if (!existing) {
            throw new ApiError({ status: 404, message: "Availability slot not found." });
          }
          Object.assign(existing, input);
          saved = { ...existing };
          return;
        }

        const slot: DoctorAvailability = { ...input, id: createId("avl") };
        db.availability = [...db.availability, slot];
        saved = { ...slot };
      });

      return saved as DoctorAvailability;
    });
  }

  removeAvailability(id: string): Promise<void> {
    return respond(() => {
      demoDb.mutate((db) => {
        db.availability = db.availability.filter((slot) => slot.id !== id);
      });
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Hospitals                                  */
/* -------------------------------------------------------------------------- */

export class MockHospitalService implements HospitalService {
  list(filter?: HospitalFilter): Promise<Hospital[]> {
    return respond(() => {
      const search = filter?.search?.trim().toLowerCase();

      return demoDb
        .get()
        .hospitals.filter((hospital) => {
          if (
            filter?.approvalStatus &&
            hospital.approvalStatus !== filter.approvalStatus
          ) {
            return false;
          }
          if (filter?.city && hospital.city !== filter.city) return false;
          if (
            search &&
            !`${hospital.name} ${hospital.city}`.toLowerCase().includes(search)
          ) {
            return false;
          }
          return true;
        })
        .map((hospital) => ({ ...hospital }));
    });
  }

  getById(id: string): Promise<Hospital | null> {
    return respond(() => {
      const hospital = demoDb.get().hospitals.find((item) => item.id === id);
      return hospital ? { ...hospital } : null;
    });
  }

  update(id: string, patch: Partial<Hospital>): Promise<Hospital> {
    return respond(() => {
      let updated: Hospital | undefined;
      demoDb.mutate((db) => {
        const hospital = db.hospitals.find((item) => item.id === id);
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }
        Object.assign(hospital, patch);
        updated = { ...hospital };
      });
      return updated as Hospital;
    });
  }

  listPendingApprovals(): Promise<Hospital[]> {
    return respond(() =>
      demoDb
        .get()
        .hospitals.filter((hospital) => hospital.approvalStatus === "PENDING")
        .map((hospital) => ({ ...hospital })),
    );
  }

  setApprovalStatus(
    id: string,
    status: HospitalApprovalStatus,
  ): Promise<Hospital> {
    return respond(() => {
      let updated: Hospital | undefined;

      demoDb.mutate((db) => {
        const hospital = db.hospitals.find((item) => item.id === id);
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }

        hospital.approvalStatus = status;
        hospital.isVerified = status === "APPROVED";
        updated = { ...hospital };

        const admin = db.hospitalAdmins.find((item) => item.hospitalId === id);
        if (admin) {
          pushNotification(db, {
            userId: admin.id,
            title: `Hospital ${status.toLowerCase()}`,
            message: `${hospital.name} was ${status.toLowerCase()} by the platform team.`,
            type: "APPROVAL",
            link: "/hospital-admin/profile",
          });
        }
      });

      return updated as Hospital;
    });
  }

  updateCapacity(
    id: string,
    patch: Partial<HospitalCapacity>,
  ): Promise<Hospital> {
    return respond(() => {
      let updated: Hospital | undefined;
      demoDb.mutate((db) => {
        const hospital = db.hospitals.find((item) => item.id === id);
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }
        hospital.capacity = { ...hospital.capacity, ...patch };
        updated = { ...hospital };
      });
      return updated as Hospital;
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                               Notifications                                */
/* -------------------------------------------------------------------------- */

export class MockNotificationService implements NotificationService {
  listForUser(userId: string): Promise<Notification[]> {
    return respond(() =>
      demoDb
        .get()
        .notifications.filter((notification) => notification.userId === userId)
        .map((notification) => ({ ...notification })),
    );
  }

  markRead(id: string): Promise<void> {
    return respond(() => {
      demoDb.mutate((db) => {
        const notification = db.notifications.find((item) => item.id === id);
        if (notification) notification.isRead = true;
      });
    });
  }

  markAllRead(userId: string): Promise<void> {
    return respond(() => {
      demoDb.mutate((db) => {
        db.notifications.forEach((notification) => {
          if (notification.userId === userId) notification.isRead = true;
        });
      });
    });
  }

  unreadCount(userId: string): Promise<number> {
    return respond(
      () =>
        demoDb
          .get()
          .notifications.filter(
            (notification) => notification.userId === userId && !notification.isRead,
          ).length,
      40,
    );
  }
}
