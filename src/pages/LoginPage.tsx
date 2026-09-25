import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, login } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const { token, expiresIn } = await login(values.email, values.password);
      setSession(token, expiresIn);
      navigate("/files", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError("Invalid email or password");
      } else {
        setFormError("Something went wrong, try again");
      }
    }
  };

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-muted)]/70 focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)]";

  const labelClass = "mb-2 block text-[13px] font-medium text-[var(--color-ink)]";

  const errorTextClass = "mt-2 flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-5 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px]">
        <div className="mb-14 text-center">
          <span className="font-[var(--font-serif)] text-[36px] font-bold tracking-tight text-[var(--color-ink)]">
            klaody
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-9 sm:p-10">
          <h1 className="text-[28px]">Sign in</h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">Access your files</p>

          <form className="mt-9 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                className={inputClass}
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className={errorTextClass}>
                  <AlertCircle className="h-[13px] w-[13px] shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? "true" : "false"}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-[15px] w-[15px]" />
                  ) : (
                    <Eye className="h-[15px] w-[15px]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className={errorTextClass}>
                  <AlertCircle className="h-[13px] w-[13px] shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">
                <AlertCircle className="h-[14px] w-[14px] shrink-0" />
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-[15px] w-[15px] animate-spin" />}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
