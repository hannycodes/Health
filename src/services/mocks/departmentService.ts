import { ApiError } from "@/lib/http";
import type { CreateDepartmentInput, Department, DepartmentStatus } from "@/types";
import type { DepartmentFilter, DepartmentService } from "@/services/interfaces";
import { pushNotification } from "./notifications";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

function normalise(value: string) {
  return value.trim().toLowerCase();
}

/** A department name must be unique inside one hospital, not platform-wide. */
function assertUniqueName(
  departments: Department[],
  hospitalId: string,
  name: string,
  ignoreId?: string,
) {
  const clash = departments.some(
    (department) =>
      department.id !== ignoreId &&
      department.hospitalId === hospitalId &&
      normalise(department.name) === normalise(name),
  );
  if (clash) {
    throw new ApiError({
      status: 409,
      message: "A department with that name already exists in this hospital.",
    });
  }
}

function notifyHospitalAdmins(hospitalId: string, title: string, message: string) {
  const db = demoDb.get();
  return db.hospitalAdmins
    .filter((admin) => admin.hospitalId === hospitalId)
    .map((admin) => ({ admin, title, message }));
}

/**
 * MOCK ONLY — department management for the hospital admin portal.
 *
 * Every operation is scoped to the hospital carried by the caller, mirroring
 * the isolation the backend must enforce.
 */
export class MockDepartmentService implements DepartmentService {
  list(filter?: DepartmentFilter): Promise<Department[]> {
    return respond(() => {
      const search = filter?.search?.trim().toLowerCase();

      return demoDb
        .get()
        .departments.filter((department) => {
          if (filter?.hospitalId && department.hospitalId !== filter.hospitalId) {
            return false;
          }
          if (filter?.specialty && department.specialty !== filter.specialty) {
            return false;
          }
          if (filter?.status && department.status !== filter.status) {
            return false;
          }
          if (
            search &&
            !`${department.name} ${department.description} ${department.specialty}`
              .toLowerCase()
              .includes(search)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((department) => ({ ...department }));
    });
  }

  getById(id: string): Promise<Department | null> {
    return respond(() => {
      const department = demoDb.get().departments.find((item) => item.id === id);
      return department ? { ...department } : null;
    });
  }

  create(input: CreateDepartmentInput): Promise<Department> {
    return respond(() => {
      let created: Department | undefined;

      demoDb.mutate((db) => {
        const hospital = db.hospitals.find((item) => item.id === input.hospitalId);
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }

        assertUniqueName(db.departments, input.hospitalId, input.name);

        const department: Department = {
          id: createId("dep"),
          hospitalId: input.hospitalId,
          name: input.name.trim(),
          description: input.description.trim(),
          specialty: input.specialty,
          contactPhone: input.contactPhone?.trim() || undefined,
          contactEmail: input.contactEmail?.trim() || undefined,
          location: input.location?.trim() || undefined,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };

        db.departments = [department, ...db.departments];
        created = { ...department };

        notifyHospitalAdmins(
          input.hospitalId,
          "Department created",
          `${department.name} was added to ${hospital.name}.`,
        ).forEach(({ admin, title, message }) => {
          pushNotification(db, {
            userId: admin.id,
            title,
            message,
            type: "SYSTEM",
            link: "/hospital-admin/departments",
          });
        });
      });

      return created as Department;
    });
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        Department,
        | "name"
        | "description"
        | "specialty"
        | "contactPhone"
        | "contactEmail"
        | "location"
      >
    >,
  ): Promise<Department> {
    return respond(() => {
      let updated: Department | undefined;

      demoDb.mutate((db) => {
        const department = db.departments.find((item) => item.id === id);
        if (!department) {
          throw new ApiError({ status: 404, message: "Department not found." });
        }
        if (patch.name) {
          assertUniqueName(db.departments, department.hospitalId, patch.name, id);
        }

        Object.assign(department, patch);
        updated = { ...department };
      });

      return updated as Department;
    });
  }

  setStatus(id: string, status: DepartmentStatus): Promise<Department> {
    return respond(() => {
      let updated: Department | undefined;

      demoDb.mutate((db) => {
        const department = db.departments.find((item) => item.id === id);
        if (!department) {
          throw new ApiError({ status: 404, message: "Department not found." });
        }
        department.status = status;
        updated = { ...department };
      });

      return updated as Department;
    });
  }
}
