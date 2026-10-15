import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/States";

export function PublicRoute() {
  const { loading } = useAuth();
  if (loading) return <LoadingState label="Restoring your secure session…" />;
  return <Outlet />;
}
