import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  /** Roles allowed to render the nested routes. Omit to allow any signed-in user. */
  allowedRoles?: Role[];
}

/**
 * Frontend route guard.
 *
 * This only shapes the UX — it is NOT a security boundary. The backend must
 * authorize every request independently.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
