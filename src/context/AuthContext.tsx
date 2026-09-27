import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_EXPIRED_EVENT, getMe } from "../lib/api";

const TOKEN_KEY = "klaody.token";
const EXPIRES_AT_KEY = "klaody.tokenExpiresAt";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setSession: (token: string, expiresIn: number) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token || !expiresAt) return null;

  if (Date.now() > Number(expiresAt)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    return null;
  }

  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const queryClient = useQueryClient();

  const setSession = useCallback((newToken: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    setToken(newToken);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    setToken(null);
    queryClient.removeQueries({ queryKey: ["me"] });
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  const { data: currentUser } = useQuery({
    queryKey: ["me", token],
    queryFn: getMe,
    enabled: token !== null,
    staleTime: 5 * 60_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: token !== null,
      isAdmin: currentUser?.isAdmin ?? false,
      setSession,
      clearSession,
    }),
    [token, currentUser, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}