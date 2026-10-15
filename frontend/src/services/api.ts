import { firebaseAuth } from "../lib/firebase";

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

async function fetchApi(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (cause) {
    if (cause instanceof TypeError) {
      throw new Error(`Cannot connect to the backend API at ${baseUrl}. Start the backend from its folder with "npm run dev" and make sure MongoDB is running.`);
    }
    throw cause;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await firebaseAuth?.currentUser?.getIdToken();
  const response = await fetchApi(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = `Request failed (${response.status}).`;
    }
    const error = new Error(message);
    Object.assign(error, { status: response.status });
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const queryKeys = {
  organizations: ["organizations"] as const,
  tickets: (organizationId: string, filters: string) => ["tickets", organizationId, filters] as const,
  conversations: (organizationId: string) => ["conversations", organizationId] as const,
  members: (organizationId: string) => ["members", organizationId] as const,
  audit: (organizationId: string) => ["audit", organizationId] as const
};
