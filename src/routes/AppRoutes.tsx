import type { RouteObject } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { DoctorLayout } from "@/layouts/DoctorLayout";
import { HospitalAdminLayout } from "@/layouts/HospitalAdminLayout";
import { PatientLayout } from "@/layouts/PatientLayout";
import { SuperAdminLayout } from "@/layouts/SuperAdminLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { PatientAiNavigator } from "@/pages/patient/PatientAiNavigator";
import { PatientAppointments } from "@/pages/patient/PatientAppointments";
import { PatientDashboard } from "@/pages/patient/PatientDashboard";
import { PatientDoctors } from "@/pages/patient/PatientDoctors";
import { PatientHospitals } from "@/pages/patient/PatientHospitals";
import { PatientMedicalHistory } from "@/pages/patient/PatientMedicalHistory";
import { PatientProfile } from "@/pages/patient/PatientProfile";
import { NotFoundPage } from "@/pages/shared/NotFoundPage";
import { ScaffoldPage } from "@/pages/shared/ScaffoldPage";
import { UnauthorizedPage } from "@/pages/shared/UnauthorizedPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootRedirect } from "./RootRedirect";

/**
 * Application route tree.
 *
 * Every authenticated group is wrapped in `ProtectedRoute` with the roles that
 * may enter it. Unbuilt screens render `ScaffoldPage` so their owner can drop
 * in a real page without touching this file's structure.
 */
export const appRoutes: RouteObject[] = [
  { path: "/", element: <RootRedirect /> },
  {
    path: "/login",
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute allowedRoles={["PATIENT"]} />,
    children: [
      {
        path: "/patient",
        element: <PatientLayout />,
        children: [
          { index: true, element: <PatientDashboard /> },
          { path: "hospitals", element: <PatientHospitals /> },
          { path: "doctors", element: <PatientDoctors /> },
          { path: "ai-navigator", element: <PatientAiNavigator /> },
          { path: "appointments", element: <PatientAppointments /> },
          { path: "medical-history", element: <PatientMedicalHistory /> },
          { path: "profile", element: <PatientProfile /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["DOCTOR"]} />,
    children: [
      {
        path: "/doctor",
        element: <DoctorLayout />,
        children: [
          {
            index: true,
            element: (
              <ScaffoldPage
                title="Doctor dashboard"
                description="Today's schedule, patient load and pending appointments."
                breadcrumbs={[{ label: "Doctor" }]}
                owner="Doctor dashboard owner"
              />
            ),
          },
          {
            path: "appointments",
            element: (
              <ScaffoldPage
                title="Appointments"
                description="All appointments booked with you, including completed visits."
                breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Appointments" }]}
                owner="Doctor dashboard owner"
              />
            ),
          },
          {
            path: "patients",
            element: (
              <ScaffoldPage
                title="Patients"
                description="Patients you have consulted, with their visit history."
                breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Patients" }]}
                owner="Doctor dashboard owner"
              />
            ),
          },
          {
            path: "availability",
            element: (
              <ScaffoldPage
                title="Availability"
                description="Weekly working hours and consultation slot length."
                breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Availability" }]}
                owner="Doctor dashboard owner"
              />
            ),
          },
          {
            path: "profile",
            element: (
              <ScaffoldPage
                title="Profile"
                description="Public profile, specialty, consultation fee and bio."
                breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Profile" }]}
                owner="Doctor dashboard owner"
              />
            ),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]} />,
    children: [
      {
        path: "/hospital-admin",
        element: <HospitalAdminLayout />,
        children: [
          {
            index: true,
            element: (
              <ScaffoldPage
                title="Hospital dashboard"
                description="Appointments, doctor roster and bed capacity at a glance."
                breadcrumbs={[{ label: "Hospital admin" }]}
                owner="Hospital admin owner"
              />
            ),
          },
          {
            path: "doctors",
            element: (
              <ScaffoldPage
                title="Doctors"
                description="Doctors practising at your hospital."
                breadcrumbs={[
                  { label: "Hospital admin", to: "/hospital-admin" },
                  { label: "Doctors" },
                ]}
                owner="Hospital admin owner"
              />
            ),
          },
          {
            path: "appointments",
            element: (
              <ScaffoldPage
                title="Appointments"
                description="Every appointment booked at your hospital."
                breadcrumbs={[
                  { label: "Hospital admin", to: "/hospital-admin" },
                  { label: "Appointments" },
                ]}
                owner="Hospital admin owner"
              />
            ),
          },
          {
            path: "profile",
            element: (
              <ScaffoldPage
                title="Hospital profile"
                description="Contact details, description and listed specialties."
                breadcrumbs={[
                  { label: "Hospital admin", to: "/hospital-admin" },
                  { label: "Hospital profile" },
                ]}
                owner="Hospital admin owner"
              />
            ),
          },
          {
            path: "capacity",
            element: (
              <ScaffoldPage
                title="Capacity"
                description="Bed availability and occupancy for the hospital."
                breadcrumbs={[
                  { label: "Hospital admin", to: "/hospital-admin" },
                  { label: "Capacity" },
                ]}
                owner="Hospital admin owner"
              />
            ),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />,
    children: [
      {
        path: "/super-admin",
        element: <SuperAdminLayout />,
        children: [
          {
            index: true,
            element: (
              <ScaffoldPage
                title="Platform dashboard"
                description="Network-wide hospitals, users and appointment volume."
                breadcrumbs={[{ label: "Super admin" }]}
                owner="Auth & super admin owner"
              />
            ),
          },
          {
            path: "hospitals",
            element: (
              <ScaffoldPage
                title="Hospitals"
                description="All hospitals registered on MyHealth."
                breadcrumbs={[
                  { label: "Super admin", to: "/super-admin" },
                  { label: "Hospitals" },
                ]}
                owner="Auth & super admin owner"
              />
            ),
          },
          {
            path: "users",
            element: (
              <ScaffoldPage
                title="Users"
                description="Patients, doctors and administrators on the platform."
                breadcrumbs={[
                  { label: "Super admin", to: "/super-admin" },
                  { label: "Users" },
                ]}
                owner="Auth & super admin owner"
              />
            ),
          },
          {
            path: "approvals",
            element: (
              <ScaffoldPage
                title="Hospital approvals"
                description="Hospitals awaiting verification before they can accept bookings."
                breadcrumbs={[
                  { label: "Super admin", to: "/super-admin" },
                  { label: "Approvals" },
                ]}
                owner="Auth & super admin owner"
              />
            ),
          },
        ],
      },
    ],
  },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  { path: "*", element: <NotFoundPage /> },
];
