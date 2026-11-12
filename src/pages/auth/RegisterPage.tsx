import { Link } from "react-router-dom";
import { Building2, Stethoscope, UserRound, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const OPTIONS: {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  cta: string;
}[] = [
  {
    title: "I'm a patient",
    description:
      "Book appointments, follow your care and keep your medical history in one place.",
    icon: UserRound,
    to: "/register/patient",
    cta: "Create a patient account",
  },
  {
    title: "I'm a doctor",
    description:
      "Apply to cover shifts at hospitals that need cover. The platform administrator verifies your licence and documents.",
    icon: Stethoscope,
    to: "/register/doctor",
    cta: "Apply as a doctor",
  },
  {
    title: "I manage a hospital",
    description:
      "Request onboarding for your hospital so your team can post shifts and manage appointments.",
    icon: Building2,
    to: "/register/hospital",
    cta: "Apply for a hospital",
  },
];

export function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your MyHealth account</CardTitle>
        <CardDescription>
          Choose what you are signing up as. Each account type has its own form and
          verification process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {OPTIONS.map((option) => (
          <Link
            key={option.title}
            to={option.to}
            className="hover:border-primary/40 hover:bg-brand-mint/40 group flex items-start gap-3 rounded-xl border p-4 transition-colors"
          >
            <span className="bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors">
              <option.icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                {option.description}
              </span>
              <span className="text-primary mt-2 block text-xs font-medium">
                {option.cta} →
              </span>
            </span>
          </Link>
        ))}

        <p className="text-muted-foreground pt-1 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
