import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AUTH_EXPIRED_EVENT, getMe } from "../lib/api";

const TOKEN_KEY = "klaody.token";
const EXPIRES_AT_KEY = "klaody.tokenExpiresAt";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  /** Whether the current user is an admin. False while loading or logged out. */
  isAdmin: boolean;
  /** Persist a freshly issued token and schedule its expiry. */
  setSession: (token: string, expiresIn: number) => void;
  /** Clear the session, e.g. on logout or a 401 from the API. */
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
  }, []);

  // The API client dispatches this on any 401, e.g. once the token expires
  // mid-session — treat it the same as an explicit logout.
  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  // Only the JWT's subject is available client-side, so admin status is
  // fetched separately and cached — refetched whenever the session changes.
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
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
