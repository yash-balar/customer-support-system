import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/env";
import { getFirebaseAdminInitializationError } from "../config/firebaseAdmin";
import { HttpError } from "../utils/errors";

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required.");
    const token = header.slice(7);
    if (env.NODE_ENV === "test" && env.TEST_AUTH_ENABLED === "true") {
      const [testPrefix, uid, email, emailVerified] = token.split(":");
      if (testPrefix !== "test" || !uid) throw new HttpError(401, "Invalid authentication token.");
      req.user = { uid, email, emailVerified: emailVerified !== "false" };
      next();
      return;
    }
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified };
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }
    const initializationError = getFirebaseAdminInitializationError();
    next(initializationError
      ? new HttpError(503, `Authentication is temporarily unavailable. ${initializationError}`)
      : new HttpError(401, "Invalid or expired Firebase sign-in session."));
  }
}
