import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, HardDrive, Loader2 } from "lucide-react";
import { ApiError, login } from "../lib/api";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-4 dark:bg-[#17181A]">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2">
          <HardDrive className="h-[18px] w-[18px] text-[#2A3D66] dark:text-[#7C97C4]" strokeWidth={2} />
          <span className="font-mono text-[15px] tracking-tight text-[#1C1B19] dark:text-[#EDEDEC]">
            klaody
          </span>
        </div>

        <div className="rounded-lg border border-[#E2E0DA] bg-white p-8 dark:border-[#2C2E31] dark:bg-[#1F2123]">
          <h1 className="text-[20px] font-semibold text-[#1C1B19] dark:text-[#EDEDEC]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[#6B6862] dark:text-[#9A9A96]">
            Access your files
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[#1C1B19] dark:text-[#EDEDEC]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                className="w-full rounded-md border border-[#E2E0DA] bg-transparent px-3 py-2 text-sm text-[#1C1B19] outline-none transition-colors placeholder:text-[#A6A39C] focus:border-[#2A3D66] focus:ring-2 focus:ring-[#2A3D66]/25 dark:border-[#2C2E31] dark:text-[#EDEDEC] dark:focus:border-[#7C97C4] dark:focus:ring-[#7C97C4]/25"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-[13px] text-[#B3261E] dark:text-[#E28B85]">
                  <AlertCircle className="h-[13px] w-[13px] shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[#1C1B19] dark:text-[#EDEDEC]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? "true" : "false"}
                  className="w-full rounded-md border border-[#E2E0DA] bg-transparent px-3 py-2 pr-10 text-sm text-[#1C1B19] outline-none transition-colors placeholder:text-[#A6A39C] focus:border-[#2A3D66] focus:ring-2 focus:ring-[#2A3D66]/25 dark:border-[#2C2E31] dark:text-[#EDEDEC] dark:focus:border-[#7C97C4] dark:focus:ring-[#7C97C4]/25"
                  placeholder="••••••••"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[#6B6862] hover:text-[#1C1B19] dark:text-[#9A9A96] dark:hover:text-[#EDEDEC]"
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
                <p className="mt-1.5 flex items-center gap-1 text-[13px] text-[#B3261E] dark:text-[#E28B85]">
                  <AlertCircle className="h-[13px] w-[13px] shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-[#F0C9C6] bg-[#FBF1F0] px-3 py-2 text-[13px] text-[#B3261E] dark:border-[#4A2E2B] dark:bg-[#2A1D1C] dark:text-[#E28B85]">
                <AlertCircle className="h-[14px] w-[14px] shrink-0" />
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2A3D66] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#22314F] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#3E578D] dark:hover:bg-[#4A6499]"
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
