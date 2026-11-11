import { Navigate } from "react-router-dom";

import { ROLE_HOME } from "@/constants";
import { useAuth } from "@/hooks/useAuth";

export function RootRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={ROLE_HOME[role]} replace />;
}
