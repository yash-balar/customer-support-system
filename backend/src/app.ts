import express from "express";
import cors from "cors";
import { authenticate } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errors";
import { organizationRouter } from "./routes/organizations";
import { ticketRouter } from "./routes/tickets";
import { conversationRouter } from "./routes/conversations";
import { invitationRouter, organizationInvitationRouter } from "./routes/invitations";
import { env } from "./config/env";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  const allowedOrigins = new Set([env.CLIENT_ORIGIN]);
  if (env.NODE_ENV !== "production") {
    const localOrigin = new URL(env.CLIENT_ORIGIN);
    if (localOrigin.hostname === "localhost") {
      localOrigin.hostname = "127.0.0.1";
      allowedOrigins.add(localOrigin.origin);
    } else if (localOrigin.hostname === "127.0.0.1") {
      localOrigin.hostname = "localhost";
      allowedOrigins.add(localOrigin.origin);
    }
  }
  app.use(cors({ origin: [...allowedOrigins] }));
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", authenticate);
  app.get("/api/me", (req, res) => res.json({ user: req.user }));
  app.use("/api/invitations", invitationRouter);
  app.use("/api/organizations", organizationRouter);
  app.use("/api/organizations/:organizationId/invitations", organizationInvitationRouter);
  app.use("/api/organizations/:organizationId/tickets", ticketRouter);
  app.use("/api/organizations/:organizationId/conversations", conversationRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
