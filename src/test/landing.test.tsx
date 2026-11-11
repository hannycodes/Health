import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { appRoutes } from "@/routes/AppRoutes";

function renderLanding() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

describe("landing page", () => {
  it("renders the hero and every section without authentication", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { level: 1, name: /your health journey/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /healthcare should feel connected/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /one platform/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /everything you need/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a simpler healthcare journey/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /intelligence that supports human care/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a more connected healthcare experience/i }),
    ).toBeInTheDocument();

    for (const id of [
      "top",
      "features",
      "how-it-works",
      "for-patients",
      "for-hospitals",
      "about",
    ]) {
      expect(document.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("shows the official logo and working anchor navigation", () => {
    renderLanding();

    expect(screen.getAllByAltText("MyHealth").length).toBeGreaterThan(0);

    const featuresLinks = screen.getAllByRole("link", { name: "Features" });
    expect(featuresLinks[0]).toHaveAttribute("href", "#features");

    const hospitalLinks = screen.getAllByRole("link", { name: "For Hospitals" });
    expect(hospitalLinks[0]).toHaveAttribute("href", "#for-hospitals");
  });

  it("opens the role selection dialog from Get Started", async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getAllByRole("button", { name: /get started/i })[0]);

    expect(
      await screen.findByText(/choose how you'll use myhealth/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i'm a patient/i })).toBeInTheDocument();
  });

  it("routes sign-in users toward the existing login flow", () => {
    renderLanding();

    const signInLinks = screen.getAllByRole("link", { name: /^sign in$/i });
    expect(signInLinks[0]).toHaveAttribute("href", "/login");
  });
});
