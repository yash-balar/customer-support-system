export const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  VIEWER: "Viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_AUDIT: "audit:view",
  MANAGE_SETTINGS: "settings:manage",
  MANAGE_TEAM: "team:manage",
  CREATE_TICKET: "tickets:create",
  EDIT_ANY_TICKET: "tickets:edit:any",
  EDIT_OWN_TICKET: "tickets:edit:own",
  DELETE_TICKET: "tickets:delete",
  ASSIGN_TICKET: "tickets:assign",
  CREATE_CONVERSATION: "conversations:create",
  UPDATE_CONVERSATION: "conversations:update",
  ASSIGN_CONVERSATION: "conversations:assign",
  REPLY_TO_ANY_CONVERSATION: "conversations:reply:any",
  REPLY_TO_OWN_CONVERSATION: "conversations:reply:own",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS).filter(
    (permission) => permission !== PERMISSIONS.EDIT_OWN_TICKET,
  ),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_AUDIT,
    PERMISSIONS.CREATE_TICKET,
    PERMISSIONS.EDIT_ANY_TICKET,
    PERMISSIONS.DELETE_TICKET,
    PERMISSIONS.ASSIGN_TICKET,
    PERMISSIONS.CREATE_CONVERSATION,
    PERMISSIONS.UPDATE_CONVERSATION,
    PERMISSIONS.ASSIGN_CONVERSATION,
    PERMISSIONS.REPLY_TO_ANY_CONVERSATION,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.CREATE_TICKET,
    PERMISSIONS.EDIT_OWN_TICKET,
    PERMISSIONS.CREATE_CONVERSATION,
    PERMISSIONS.UPDATE_CONVERSATION,
    PERMISSIONS.REPLY_TO_OWN_CONVERSATION,
  ],
  [ROLES.VIEWER]: [],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}
