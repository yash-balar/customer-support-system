import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface WorkspaceValue {
  organizationId: string | null;
  setOrganizationId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganization] = useState<string | null>(() => localStorage.getItem("active-organization"));
  const setOrganizationId = useCallback((id: string | null) => {
    if (id === organizationId) return;
    if (id) localStorage.setItem("active-organization", id);
    else localStorage.removeItem("active-organization");
    setOrganization(id);
  }, [organizationId]);
  const value = useMemo(() => ({ organizationId, setOrganizationId }), [organizationId]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is missing.");
  return value;
}
