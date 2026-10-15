import type { Role } from "../models/Membership";

export type Permission =
  | "tickets:create"
  | "tickets:assign"
  | "tickets:update"
  | "tickets:delete"
  | "members:manage"
  | "settings:manage"
  | "audit:read";

const permissions: Record<Role, Permission[]> = {
  Owner: ["tickets:create", "tickets:assign", "tickets:update", "tickets:delete", "members:manage", "settings:manage", "audit:read"],
  Admin: ["tickets:create", "tickets:assign", "tickets:update", "tickets:delete", "members:manage", "settings:manage", "audit:read"],
  Manager: ["tickets:create", "tickets:assign", "tickets:update", "tickets:delete", "audit:read"],
  Member: ["tickets:create", "tickets:update"],
  Viewer: []
};

export function can(role: Role, permission: Permission): boolean {
  return permissions[role].includes(permission);
}

export function canEditTicket(role: Role, actorId: string, assigneeId: string | null | undefined, creatorId: string): boolean {
  if (role === "Owner" || role === "Admin" || role === "Manager") return true;
  return role === "Member" && (assigneeId === actorId || creatorId === actorId);
}
