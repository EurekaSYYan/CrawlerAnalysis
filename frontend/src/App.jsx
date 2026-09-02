import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import AnalyticsView from "./views/AnalyticsView.jsx";
import ConsoleView from "./views/ConsoleView.jsx";
import DashboardView from "./views/DashboardView.jsx";
import ListingDetailView from "./views/ListingDetailView.jsx";
import ListingsView from "./views/ListingsView.jsx";
import LoginView from "./views/LoginView.jsx";
import ProfileView from "./views/ProfileView.jsx";

function RequireAuth({ children }) {
  const { user, booting } = useAuth();
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment text-slate">
        正在读取会话…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardView />} />
              <Route path="/houses" element={<ListingsView />} />
              <Route path="/houses/:id" element={<ListingDetailView />} />
              <Route path="/analytics" element={<AnalyticsView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/console" element={<ConsoleView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
