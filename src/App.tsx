import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { appRoutes } from "@/routes/AppRoutes";

const router = createBrowserRouter(appRoutes);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
