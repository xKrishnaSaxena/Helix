import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthForm";
import { AuthProvider, useAuth } from "./contexts/authContext";
import IndexingPreferencesForm from "./pages/IndexingPreferences";
import { JSX } from "react";
import { WebhookProvider } from "./contexts/webhookContext";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebhookProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <IndexingPreferencesForm />
                </ProtectedRoute>
              }
            />

            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </WebhookProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
