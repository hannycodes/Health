import { Navigate, type RouteObject } from "react-router-dom";

import { AdminWorkforcePage } from "@/modules/workforce/AdminPage";
import {
  HospitalWorkforceAnalyticsPage,
  HospitalWorkforceApplicantsPage,
  HospitalWorkforceCreatePage,
  HospitalWorkforceDashboardPage,
  HospitalWorkforceInterviewsPage,
  HospitalWorkforceOffersPage,
  HospitalWorkforceOpportunitiesPage,
} from "@/modules/workforce/HospitalPages";
import { workforceRoutes } from "@/modules/workforce/routes";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DoctorLayout } from "@/layouts/DoctorLayout";
import { HospitalAdminLayout } from "@/layouts/HospitalAdminLayout";
import { PatientLayout } from "@/layouts/PatientLayout";
import { SuperAdminLayout } from "@/layouts/SuperAdminLayout";
import { LandingPage } from "@/pages/LandingPage";
import { AccountPendingPage } from "@/pages/auth/AccountPendingPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
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
import { AdminActivityPage } from "@/pages/super-admin/AdminActivityPage";
import { AdminAnalyticsPage } from "@/pages/super-admin/AdminAnalyticsPage";
import { AdminDashboardPage } from "@/pages/super-admin/AdminDashboardPage";
import { AdminDoctorsPage } from "@/pages/super-admin/AdminDoctorsPage";
import { AdminHospitalsPage } from "@/pages/super-admin/AdminHospitalsPage";
import { AdminNotificationsPage } from "@/pages/super-admin/AdminNotificationsPage";
import { AdminPatientsPage } from "@/pages/super-admin/AdminPatientsPage";
import { AdminSettingsPage } from "@/pages/super-admin/AdminSettingsPage";
import { AdminUserDetailsPage } from "@/pages/super-admin/AdminUserDetailsPage";
import { AdminUsersPage } from "@/pages/super-admin/AdminUsersPage";
import { AdministratorsPage } from "@/pages/super-admin/AdministratorsPage";
import { HospitalDetailsPage } from "@/pages/super-admin/HospitalDetailsPage";
import { PendingHospitalsPage } from "@/pages/super-admin/PendingHospitalsPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRedirect } from "./RoleRedirect";

/**
 * Application route tree.
 *
 * Shared auth lives under `AuthLayout`; every authenticated group is wrapped in
 * `ProtectedRoute` with the roles that may enter it. Unbuilt doctor and
 * hospital-admin screens still render `ScaffoldPage` for their owners.
 */
export const appRoutes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/account-pending", element: <AccountPendingPage /> },
    ],
  },
  { path: "/dashboard", element: <RoleRedirect /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
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
        path: "/admin",
        element: <SuperAdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "hospitals", element: <AdminHospitalsPage /> },
          { path: "hospitals/pending", element: <PendingHospitalsPage /> },
          { path: "hospitals/:id", element: <HospitalDetailsPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "users/:id", element: <AdminUserDetailsPage /> },
          { path: "doctors", element: <AdminDoctorsPage /> },
          { path: "patients", element: <AdminPatientsPage /> },
          { path: "administrators", element: <AdministratorsPage /> },
          { path: "analytics", element: <AdminAnalyticsPage /> },
          { path: "activity", element: <AdminActivityPage /> },
          { path: "notifications", element: <AdminNotificationsPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          { path: "workforce", element: <AdminWorkforcePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]} />,
    children: [
      {
        path: "/hospital/workforce",
        element: <HospitalAdminLayout />,
        children: [
          { index: true, element: <HospitalWorkforceDashboardPage /> },
          { path: "opportunities", element: <HospitalWorkforceOpportunitiesPage /> },
          { path: "opportunities/create", element: <HospitalWorkforceCreatePage /> },
          { path: "applicants", element: <HospitalWorkforceApplicantsPage /> },
          { path: "interviews", element: <HospitalWorkforceInterviewsPage /> },
          { path: "offers", element: <HospitalWorkforceOffersPage /> },
          { path: "analytics", element: <HospitalWorkforceAnalyticsPage /> },
        ],
      },
    ],
  },
  ...workforceRoutes,
  // Legacy path kept as a redirect so older links and seeded notifications work.
  { path: "/super-admin", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/super-admin/*", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "*", element: <NotFoundPage /> },
];
