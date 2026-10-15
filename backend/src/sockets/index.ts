import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/env";
import { Membership } from "../models/Membership";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, methods: ["GET", "POST"] },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== "string")
        return next(new Error("Authentication required."));
      if (env.NODE_ENV === "test" && env.TEST_AUTH_ENABLED === "true") {
        const [testPrefix, uid] = token.split(":");
        if (testPrefix !== "test" || !uid)
          return next(new Error("Invalid authentication token."));
        socket.data.uid = uid;
        return next();
      }
      const decoded = await getAuth().verifyIdToken(token);
      socket.data.uid = decoded.uid;
      next();
    } catch {
      next(new Error("Invalid authentication token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.uid}`);
    socket.on(
      "organization:join",
      async (
        organizationId: unknown,
        acknowledge?: (result: { ok: boolean; error?: string }) => void,
      ) => {
        if (
          typeof organizationId !== "string" ||
          !mongoose.isValidObjectId(organizationId)
        ) {
          acknowledge?.({ ok: false, error: "Invalid organization ID." });
          return;
        }
        try {
          const membership = await Membership.findOne({
            userId: socket.data.uid,
            organizationId,
            status: "active",
          }).lean();
          if (!membership) {
            acknowledge?.({
              ok: false,
              error: "Active organization membership required.",
            });
            return;
          }
          await socket.join(`org:${organizationId}`);
          acknowledge?.({ ok: true });
        } catch (error) {
          console.error(
            "Could not verify Socket.IO organization membership.",
            error,
          );
          acknowledge?.({
            ok: false,
            error: "Organization access could not be verified.",
          });
        }
      },
    );
    socket.on("organization:leave", (organizationId: unknown) => {
      if (typeof organizationId === "string")
        void socket.leave(`org:${organizationId}`);
    });
  });

  return io;
}

export function revokeOrganizationRoom(
  io: Server,
  userId: string,
  organizationId: string,
): void {
  const userRoom = `user:${userId}`;
  void io.in(userRoom).socketsLeave(`org:${organizationId}`);
  io.to(userRoom).emit("membership:revoked", organizationId);
}
