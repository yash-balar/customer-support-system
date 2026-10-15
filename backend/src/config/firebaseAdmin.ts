import { getApps, initializeApp } from "firebase-admin/app";
import { env } from "./env";

let initializationError: string | null = null;

export async function initializeFirebaseAdmin(): Promise<void> {
  if (env.NODE_ENV === "test") return;

  try {
    if (!env.FIREBASE_PROJECT_ID) {
      throw new Error(
        "FIREBASE_PROJECT_ID must be set so Firebase ID tokens can be verified.",
      );
    }
    if (getApps().length === 0) {
      initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    }
    initializationError = null;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown credential error.";
    initializationError = `Firebase Admin could not initialize. ${detail}`;
    console.warn(initializationError);
  }
}

export function getFirebaseAdminInitializationError(): string | null {
  return initializationError;
}
