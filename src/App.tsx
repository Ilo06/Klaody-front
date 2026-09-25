import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";
import ThemeToggle from "./components/ThemeToggle";

function FilesPage() {
  // Placeholder until the files view is built.
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-8 py-5">
        <span className="font-[var(--font-serif)] text-[20px] font-bold tracking-tight">klaody</span>
        <ThemeToggle />
      </header>
      <div className="flex flex-col items-center justify-center px-4 py-28 text-center">
        <h2 className="text-[20px]">No files yet</h2>
        <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
          Uploaded files will show up here.
        </p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/files"
        element={
          <RequireAuth>
            <FilesPage />
          </RequireAuth>
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/files" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
