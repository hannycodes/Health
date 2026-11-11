import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, ROLE_LABELS } from "@/constants";
import { DEMO_ACCOUNTS } from "@/data/demoAccounts";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/http";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const session = await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? ROLE_HOME[session.user.role], { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  function fillDemoAccount(email: string, password: string) {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
    setFormError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to MyHealth</CardTitle>
        <CardDescription>
          Use one of the demo accounts below to explore a role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-destructive text-xs">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-destructive text-xs">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <LogIn className="size-4" />
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Demo accounts
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account.email, account.password)}
                className="hover:bg-accent flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{account.description}</span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {account.email} · {account.password}
                  </span>
                </span>
                <Badge variant="secondary">{ROLE_LABELS[account.role]}</Badge>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
