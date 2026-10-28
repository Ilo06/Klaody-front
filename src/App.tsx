import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import LoginPage from "./pages/LoginPage";
import FilesPage from "./pages/FilesPage";
import TrashPage from "./pages/TrashPage";
import { useAuth } from "./context/AuthContext";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Android app only: the hardware back button goes back, and quits the app from the root screens. */
function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = CapApp.addListener("backButton", () => {
      if (location.pathname === "/files" || location.pathname === "/login") {
        void CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      void handle.then((h) => h.remove());
    };
  }, [navigate, location.pathname]);
}

function App() {
  const { isAuthenticated } = useAuth();
  useAndroidBackButton();

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
        path="/files/:folderId"
        element={
          <RequireAuth>
            <FilesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/trash"
        element={
          <RequireAuth>
            <TrashPage />
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