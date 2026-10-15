import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/support_desk"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  TEST_AUTH_ENABLED: z.enum(["true", "false"]).default("false")
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.TEST_AUTH_ENABLED === "true") {
  throw new Error("Test authentication cannot be enabled in production.");
}
