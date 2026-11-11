import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const OPTIONS: {
  title: string;
  description: string;
  icon: LucideIcon;
  role: string;
}[] = [
  {
    title: "I'm a patient",
    description: "Find care, book visits, and keep your records together.",
    icon: UserRound,
    role: "Patient",
  },
  {
    title: "I'm a doctor",
    description: "Review appointments and authorized patient history.",
    icon: Stethoscope,
    role: "Doctor",
  },
  {
    title: "I manage a hospital",
    description: "Coordinate departments, doctors, and appointments.",
    icon: Building2,
    role: "Hospital admin",
  },
  {
    title: "Platform administration",
    description: "Review hospital applications and platform activity.",
    icon: ShieldCheck,
    role: "Super admin",
  },
];

/**
 * Get Started dialog.
 *
 * This routes into the existing sign-in for the selected role.
 */
export function GetStartedDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose how you'll use MyHealth</DialogTitle>
          <DialogDescription>
            Continue to sign in to the workspace that matches how you use MyHealth.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => navigate("/login")}
              className="hover:border-primary/40 hover:bg-brand-mint/60 focus-visible:border-ring focus-visible:ring-ring/40 group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <span className="bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                <option.icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          No real patient information is used in this environment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
