import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../lib/api";

/** Admin-only: create a new account (optionally granting it admin rights). */
export function useRegisterUser() {
  return useMutation({
    mutationFn: ({ email, password, isAdmin }: { email: string; password: string; isAdmin: boolean }) =>
      registerUser(email, password, isAdmin),
  });
}
