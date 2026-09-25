import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";

function FilesPage() {
  // Placeholder until the files view is built.
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] text-[#1C1B19] dark:bg-[#17181A] dark:text-[#EDEDEC]">
      <p className="text-sm text-[#6B6862] dark:text-[#9A9A96]">Your files will show up here.</p>
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
