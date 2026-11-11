import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

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
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/http";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const result = await forgotPassword(values.email);
      setDevToken(result.devResetToken ?? null);
      setSent(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
            Check your inbox
          </CardTitle>
          <CardDescription>
            If an account exists for that address, we have sent password reset
            instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            For your security we do not confirm whether an email address is
            registered. The link expires in one hour.
          </p>

          {devToken && (
            <div className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">
                Development only — no email is sent in the demo environment
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`}>
                  Open the reset link
                </Link>
              </Button>
            </div>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link to="/login">
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email address on your MyHealth account and we will send reset
          instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
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

          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            <Mail className="size-4" />
            {form.formState.isSubmitting ? "Sending…" : "Send reset instructions"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link
            to="/login"
            className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Return to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
