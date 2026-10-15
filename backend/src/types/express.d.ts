import type { Role } from "../utils/permissions";

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email?: string; emailVerified?: boolean };
      membership?: {
        organizationId: string;
        role: Role;
        userId: string;
        status: "active" | "inactive";
      };
    }
  }
}

export {};
