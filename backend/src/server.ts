import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { initializeFirebaseAdmin } from "./config/firebaseAdmin";
import { createSocketServer } from "./sockets";

async function start(): Promise<void> {
  await initializeFirebaseAdmin();
  await connectDatabase();
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);
  app.set("io", io);
  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

start().catch((error: unknown) => {
  console.error("Could not start API server.", error);
  process.exitCode = 1;
});
