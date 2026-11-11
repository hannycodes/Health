import { Navigate } from "react-router-dom";

import { ROLE_HOME } from "@/constants";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sends a signed-in user to their role's landing page, or to sign-in when
 * there is no session. Used by `/dashboard` and by already-authenticated
 * visits to `/login`.
 */
export function RoleRedirect() {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;

  return <Navigate to={ROLE_HOME[role]} replace />;
}
