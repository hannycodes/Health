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
import { DoctorApplyPage } from "@/pages/auth/DoctorApplyPage";
import { HospitalApplyPage } from "@/pages/auth/HospitalApplyPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { PatientRegisterPage } from "@/pages/auth/PatientRegisterPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { CreateDepartmentPage } from "@/pages/hospital-admin/CreateDepartmentPage";
import { DepartmentDetailsPage } from "@/pages/hospital-admin/DepartmentDetailsPage";
import { DoctorDetailsPage } from "@/pages/hospital-admin/DoctorDetailsPage";
import { HospitalAnalyticsPage } from "@/pages/hospital-admin/HospitalAnalyticsPage";
import { HospitalAppointmentDetailsPage } from "@/pages/hospital-admin/HospitalAppointmentDetailsPage";
import { HospitalAppointmentsPage } from "@/pages/hospital-admin/HospitalAppointmentsPage";
import { HospitalCalendarPage } from "@/pages/hospital-admin/HospitalCalendarPage";
import { HospitalDashboard } from "@/pages/hospital-admin/HospitalDashboard";
import { HospitalDepartmentsPage } from "@/pages/hospital-admin/HospitalDepartmentsPage";
import { HospitalDoctorsPage } from "@/pages/hospital-admin/HospitalDoctorsPage";
import { HospitalNotificationsPage } from "@/pages/hospital-admin/HospitalNotificationsPage";
import { HospitalPatientDetailsPage } from "@/pages/hospital-admin/HospitalPatientDetailsPage";
import { HospitalPatientsPage } from "@/pages/hospital-admin/HospitalPatientsPage";
import { HospitalPaymentsPage } from "@/pages/hospital-admin/HospitalPaymentsPage";
import { HospitalProfilePage } from "@/pages/hospital-admin/HospitalProfilePage";
import { HospitalSettingsPage } from "@/pages/hospital-admin/HospitalSettingsPage";
import { RegisterDoctorPage } from "@/pages/hospital-admin/RegisterDoctorPage";
import { DoctorAppointmentDetailsPage } from "@/pages/doctor/DoctorAppointmentDetailsPage";
import { DoctorAppointmentsPage } from "@/pages/doctor/DoctorAppointmentsPage";
import { DoctorAssistantPage } from "@/pages/doctor/DoctorAssistantPage";
import { DoctorAvailabilityPage } from "@/pages/doctor/DoctorAvailabilityPage";
import { DoctorDashboardPage } from "@/pages/doctor/DoctorDashboardPage";
import { DoctorNotificationsPage } from "@/pages/doctor/DoctorNotificationsPage";
import { DoctorPatientDetailsPage } from "@/pages/doctor/DoctorPatientDetailsPage";
import { DoctorPatientHistoryPage } from "@/pages/doctor/DoctorPatientHistoryPage";
import { DoctorPatientsPage } from "@/pages/doctor/DoctorPatientsPage";
import { DoctorProfilePage } from "@/pages/doctor/DoctorProfilePage";
import { MedicalRecordDetailsPage } from "@/pages/doctor/MedicalRecordDetailsPage";
import { NewMedicalRecordPage } from "@/pages/doctor/NewMedicalRecordPage";
import { PatientAiNavigator } from "@/pages/patient/PatientAiNavigator";
import { PatientAppointments } from "@/pages/patient/PatientAppointments";
import { PatientDashboard } from "@/pages/patient/PatientDashboard";
import { PatientDoctors } from "@/pages/patient/PatientDoctors";
import { PatientHospitals } from "@/pages/patient/PatientHospitals";
import { PatientMedicalHistory } from "@/pages/patient/PatientMedicalHistory";
import { PatientProfile } from "@/pages/patient/PatientProfile";
import { NotFoundPage } from "@/pages/shared/NotFoundPage";
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
      { path: "/register/patient", element: <PatientRegisterPage /> },
      { path: "/register/doctor", element: <DoctorApplyPage /> },
      { path: "/register/hospital", element: <HospitalApplyPage /> },
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
          { index: true, element: <DoctorDashboardPage /> },
          { path: "dashboard", element: <DoctorDashboardPage /> },
          { path: "appointments", element: <DoctorAppointmentsPage /> },
          { path: "appointments/:id", element: <DoctorAppointmentDetailsPage /> },
          { path: "patients", element: <DoctorPatientsPage /> },
          { path: "patients/:id", element: <DoctorPatientDetailsPage /> },
          { path: "patients/:id/history", element: <DoctorPatientHistoryPage /> },
          { path: "patients/:id/records/new", element: <NewMedicalRecordPage /> },
          {
            path: "patients/:id/records/:recordId",
            element: <MedicalRecordDetailsPage />,
          },
          { path: "assistant", element: <DoctorAssistantPage /> },
          { path: "availability", element: <DoctorAvailabilityPage /> },
          { path: "profile", element: <DoctorProfilePage /> },
          { path: "notifications", element: <DoctorNotificationsPage /> },
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
          { index: true, element: <HospitalDashboard /> },
          { path: "dashboard", element: <Navigate to="/hospital-admin" replace /> },
          { path: "profile", element: <HospitalProfilePage /> },
          { path: "departments", element: <HospitalDepartmentsPage /> },
          { path: "departments/new", element: <CreateDepartmentPage /> },
          { path: "departments/:id", element: <DepartmentDetailsPage /> },
          { path: "doctors", element: <HospitalDoctorsPage /> },
          { path: "doctors/new", element: <RegisterDoctorPage /> },
          { path: "doctors/:id", element: <DoctorDetailsPage /> },
          { path: "appointments", element: <HospitalAppointmentsPage /> },
          { path: "appointments/:id", element: <HospitalAppointmentDetailsPage /> },
          { path: "patients", element: <HospitalPatientsPage /> },
          { path: "patients/:id", element: <HospitalPatientDetailsPage /> },
          { path: "calendar", element: <HospitalCalendarPage /> },
          { path: "analytics", element: <HospitalAnalyticsPage /> },
          { path: "payments", element: <HospitalPaymentsPage /> },
          { path: "notifications", element: <HospitalNotificationsPage /> },
          { path: "settings", element: <HospitalSettingsPage /> },
          { path: "capacity", element: <Navigate to="/hospital-admin/profile" replace /> },
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
