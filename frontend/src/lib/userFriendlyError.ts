interface CodedError {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

const firebaseMessages: Record<string, string> = {
  "auth/too-many-requests": "Firebase temporarily blocked requests because too many were made. Wait a while before trying again.",
  "auth/quota-exceeded": "Firebase has temporarily limited this action. Wait a while before trying again.",
  "auth/email-already-in-use": "An account already exists for this email. Sign in instead.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-credential": "The email or password is incorrect. Check your details and try again.",
  "auth/user-disabled": "This account has been disabled. Contact your administrator.",
  "auth/user-not-found": "No account was found for this email. Create an account first.",
  "auth/wrong-password": "The email or password is incorrect. Check your details and try again.",
  "auth/weak-password": "Choose a stronger password with at least 8 characters.",
  "auth/network-request-failed": "Could not reach Firebase. Check your internet connection and try again.",
  "auth/operation-not-allowed": "Email and password sign-in is not enabled for this Firebase project.",
  "auth/unauthorized-domain": "This website domain is not authorized in your Firebase Authentication settings.",
  "auth/requires-recent-login": "For security, sign out and sign in again before repeating this action."
};

export function userFriendlyError(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const codedError = error as CodedError;
    if (typeof codedError.code === "string" && firebaseMessages[codedError.code]) {
      return firebaseMessages[codedError.code];
    }
    if (codedError.status === 409) {
      const message = typeof codedError.message === "string" ? codedError.message.toLowerCase() : "";
      if (message.includes("invitation") || message.includes("already exists")) {
        return "An invitation is already pending for this email in this workspace. Ask the invitee to check their inbox.";
      }
      if (message.includes("member")) {
        return "This person is already a member of this workspace.";
      }
      return "This item already exists. Refresh the page and check before trying again.";
    }
    if (typeof codedError.message === "string" && codedError.message.trim()) {
      return codedError.message;
    }
  }
  return fallback;
}
