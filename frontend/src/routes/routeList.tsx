import type { ReactNode } from "react";
import { Navigate, Route, Routes, useOutletContext } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { AuthPage } from "../components/AuthPage";
import { AuditPage } from "../pages/audit";
import { HowItWorksPage } from "../pages/howItWorks/HowItWorksPage";
import { ConversationsPage } from "../pages/conversations";
import { OverviewPage } from "../pages/overview";
import { SettingsPage } from "../pages/settings";
import { TeamPage } from "../pages/team";
import {
  TicketDetailPage,
  TicketFormPage,
  TicketListPage,
} from "../pages/ticket";
import { NotFoundPage } from "../pages/notFound";
import { UnauthorizedPage } from "../pages/unauthorized";
import type { Organization } from "../types";
import {
  hasPermission,
  PERMISSIONS,
  type Permission,
} from "../constants/authorization";
import { ProtectedRoute } from "./protectedRoute";
import { PublicRoute } from "./publicRoute";

interface PrivateRouteChild {
  path?: string;
  index?: boolean;
  element: ReactNode;
  permission?: Permission;
}

export const privateRoutes: {
  path: string;
  sidebar: boolean;
  children: PrivateRouteChild[];
} = {
  path: "/app",
  sidebar: true,
  children: [
    { index: true, element: <OverviewPage /> },
    { path: "tickets", element: <TicketListPage /> },
    {
      path: "tickets/new",
      element: <TicketFormPage />,
      permission: PERMISSIONS.CREATE_TICKET,
    },
    { path: "tickets/:ticketId", element: <TicketDetailPage /> },
    { path: "conversations", element: <ConversationsPage /> },
    { path: "team", element: <TeamPage /> },
    { path: "how-it-works", element: <HowItWorksPage /> },
    {
      path: "settings",
      element: <SettingsPage />,
      permission: PERMISSIONS.MANAGE_SETTINGS,
    },
    {
      path: "audit",
      element: <AuditPage />,
      permission: PERMISSIONS.VIEW_AUDIT,
    },
  ],
};

export const publicRoutes = [
  { path: "/login", mode: "login" as const },
  { path: "/signup", mode: "signup" as const },
];

export function RouteList() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route element={<PublicRoute />}>
        {publicRoutes.map(({ path, mode }) => (
          <Route key={path} path={path} element={<AuthPage mode={mode} />} />
        ))}
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path={privateRoutes.path}
          element={<AppShell sidebar={privateRoutes.sidebar} />}
        >
          {privateRoutes.children.map(({ index, path, element, permission }) =>
            index ? (
              <Route
                key="index"
                index
                element={withPermission(element, permission)}
              />
            ) : (
              <Route
                key={path}
                path={path}
                element={withPermission(element, permission)}
              />
            ),
          )}
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function withPermission(element: ReactNode, permission?: Permission) {
  return permission ? (
    <PermissionRoute permission={permission}>{element}</PermissionRoute>
  ) : (
    element
  );
}

function PermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { organization } = useOutletContext<{ organization?: Organization }>();
  return hasPermission(organization?.role, permission) ? (
    children
  ) : (
    <Navigate to="/unauthorized" replace />
  );
}
