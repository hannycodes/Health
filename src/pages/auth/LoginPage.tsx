import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";

import { PasswordField } from "@/components/auth/PasswordField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ApiError, getApiErrorMessage } from "@/lib/http";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setErrorCode(null);
    try {
      const session = await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? ROLE_HOME[session.user.role], { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setErrorCode(error instanceof ApiError ? (error.code ?? null) : null);
    }
  }

  function fillDemoAccount(email: string, password: string) {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
    setFormError(null);
    setErrorCode(null);
  }

  const awaitingApproval =
    errorCode === "ACCOUNT_PENDING" || errorCode === "HOSPITAL_PENDING";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to MyHealth</CardTitle>
        <CardDescription>
          One account for every role — you are taken to the right workspace
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={form.formState.errors.password?.message}
            {...form.register("password")}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-4 rounded border"
                {...form.register("remember")}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-primary text-sm font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {formError && (
            <div role="alert" className="space-y-1">
              <p className="text-destructive text-sm">{formError}</p>
              {awaitingApproval && (
                <Link
                  to="/account-pending"
                  className="text-primary text-xs font-medium hover:underline"
                >
                  View pending account information →
                </Link>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            <LogIn className="size-4" />
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          New patient?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>

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
                  <span className="block text-xs font-medium">
                    {account.description}
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {account.email} · {account.password}
                  </span>
                </span>
                <Badge variant="secondary">{ROLE_LABELS[account.role]}</Badge>
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-[11px]">
            Demo environment — credentials are fictional and no real patient
            data is used.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
