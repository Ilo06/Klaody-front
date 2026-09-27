import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "./Modal";

const registerSchema = z.object({
  email: z.string().min(1, "Enter an email").email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
  isAdmin: z.boolean(),
});

export type RegisterUserValues = z.infer<typeof registerSchema>;

interface RegisterUserModalProps {
  onCancel: () => void;
  onSubmit: (values: RegisterUserValues) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function RegisterUserModal({ onCancel, onSubmit, isSubmitting, error }: RegisterUserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterUserValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { isAdmin: false },
  });

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-[16px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:py-2.5 sm:text-[14px]";
  const labelClass = "mb-2 block text-[13px] font-medium text-[var(--color-ink)]";
  const errorTextClass = "mt-2 flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]";

  return (
    <Modal title="New user" onClose={onCancel}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="new-user-email" className={labelClass}>
            Email
          </label>
          <input
            id="new-user-email"
            type="email"
            autoComplete="off"
            autoFocus
            aria-invalid={errors.email ? "true" : "false"}
            className={inputClass}
            placeholder="user@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className={errorTextClass}>
              <AlertCircle className="h-[13px] w-[13px] shrink-0" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="new-user-password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="new-user-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={errors.password ? "true" : "false"}
              className={`${inputClass} pr-11`}
              placeholder="••••••••"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
            </button>
          </div>
          {errors.password && (
            <p className={errorTextClass}>
              <AlertCircle className="h-[13px] w-[13px] shrink-0" />
              {errors.password.message}
            </p>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-[14px] text-[var(--color-ink)]">
          <input type="checkbox" className="h-4 w-4 rounded border-[var(--color-border)]" {...register("isAdmin")} />
          Make this user an admin
        </label>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">
            <AlertCircle className="h-[14px] w-[14px] shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-md px-4 py-3 text-[15px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:w-auto sm:py-2 sm:text-[14px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2 sm:text-[14px]"
          >
            {isSubmitting && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
            Create user
          </button>
        </div>
      </form>
    </Modal>
  );
}
