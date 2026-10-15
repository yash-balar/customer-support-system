import "dotenv/config";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app";
import { env } from "./config/env";
import { initializeFirebaseAdmin } from "./config/firebaseAdmin";
import { createSocketServer } from "./sockets";

async function start(): Promise<void> {
  await initializeFirebaseAdmin();
  await mongoose.connect(env.MONGODB_URI);
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);
  app.set("io", io);
  httpServer.listen(env.PORT, () => {
    console.log(`Support desk API listening on port ${env.PORT}`);
  });
}

start().catch((error: unknown) => {
  console.error("Could not start API server.", error);
  process.exitCode = 1;
});
