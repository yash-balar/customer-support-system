import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "./States";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Restoring your secure session…" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
