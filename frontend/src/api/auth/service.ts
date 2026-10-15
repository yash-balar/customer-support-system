import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { firebaseAuth } from "../../lib/firebase";

function requireAuth() {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured. Copy frontend/.env.example to frontend/.env and add your Firebase web app values.",
    );
  }
  return firebaseAuth;
}

export const authService = {
  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(requireAuth(), email, password);
  },
  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(requireAuth(), email, password);
  },
  signOut() {
    if (!firebaseAuth) {
      throw new Error(
        "Sign out is unavailable because authentication is not configured.",
      );
    }
    return signOut(firebaseAuth);
  },
};
