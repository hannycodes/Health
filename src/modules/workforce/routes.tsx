import { Navigate, Outlet, useLocation, type RouteObject } from "react-router-dom";

import { ProfessionalApplicationsPage } from "./Applications";
import { WorkforceLoginPage, WorkforceRegisterPage } from "./AuthPages";
import { WorkforceShell } from "./components";
import { WorkforceLandingPage } from "./Landing";
import { OpportunityDetailPage, OpportunitiesPage } from "./Opportunities";
import { ProfessionalNotificationsPage } from "./ProfessionalPages";
import { ProfessionalProfilePage } from "./Profile";
import { useWorkforce } from "./store";

function WorkforceProtectedRoute() {
  const { professional } = useWorkforce();
  const location = useLocation();

  if (!professional) {
    return (
      <Navigate
        to="/workforce/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}

export const workforceRoutes: RouteObject[] = [
  { path: "/workforce", element: <WorkforceLandingPage /> },
  { path: "/workforce/login", element: <WorkforceLoginPage /> },
  { path: "/workforce/register", element: <WorkforceRegisterPage /> },
  {
    element: <WorkforceProtectedRoute />,
    children: [
      {
        element: <WorkforceShell />,
        children: [
          { path: "/workforce/dashboard", element: <ProfessionalDashboardRoute /> },
          { path: "/workforce/opportunities", element: <OpportunitiesPage /> },
          { path: "/workforce/opportunities/:id", element: <OpportunityDetailPage /> },
          { path: "/workforce/applications", element: <ProfessionalApplicationsPage /> },
          { path: "/workforce/profile", element: <ProfessionalProfilePage /> },
          { path: "/workforce/notifications", element: <ProfessionalNotificationsPage /> },
        ],
      },
    ],
  },
];

import { ProfessionalDashboardPage } from "./ProfessionalPages";

function ProfessionalDashboardRoute() {
  return <ProfessionalDashboardPage />;
}
