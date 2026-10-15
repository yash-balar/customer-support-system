import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;

export const firebaseConfigured = Boolean(apiKey && projectId && appId && authDomain);
const app = firebaseConfigured
  ? getApps()[0] ?? initializeApp({ apiKey, projectId, appId, authDomain, storageBucket, messagingSenderId, measurementId })
  : null;
export const firebaseAuth = app ? getAuth(app) : null;
