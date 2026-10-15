import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Database connected.");
  } catch (error) {
    console.log("Error in Database connection");
  }
}
