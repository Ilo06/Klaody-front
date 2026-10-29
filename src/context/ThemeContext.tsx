import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

type Theme = "light" | "dark";

const STORAGE_KEY = "klaody.theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (document.documentElement.classList.contains("dark")) return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);

    // Android app: keep the status/navigation bar icons readable against the app's own theme
    // (the theme toggle can differ from the phone's system theme).
    if (Capacitor.isNativePlatform()) {
      SystemBars.setStyle({
        // Dark = light icons for a dark background, Light = dark icons for a light background.
        style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      }).catch(() => undefined);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
