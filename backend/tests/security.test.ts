import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createServer } from "node:http";
import request from "supertest";
import { io as socketClient } from "socket.io-client";
import { createApp } from "../src/app";
import { createSocketServer } from "../src/sockets";
import { Organization } from "../src/models/Organization";
import { Membership } from "../src/models/Membership";
import { Invitation } from "../src/models/Invitation";
import { Ticket } from "../src/models/Ticket";
import { Conversation } from "../src/models/Conversation";
import { AuditLog } from "../src/models/AuditLog";

const app = createApp();
let mongo: MongoMemoryServer;
let organizationId: string;
let otherOrganizationId: string;
let ticketId: string;
const auth = (uid: string) => `Bearer test:${uid}:${uid}@example.test`;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  const organization = await Organization.create({
    name: "Northstar Support",
    createdBy: "owner",
    activeOwnerCount: 1,
  });
  const otherOrganization = await Organization.create({
    name: "Other Tenant",
    createdBy: "other",
    activeOwnerCount: 1,
  });
  organizationId = String(organization._id);
  otherOrganizationId = String(otherOrganization._id);
  await Membership.create([
    { userId: "owner", organizationId, role: "Owner", status: "active" },
    { userId: "admin", organizationId, role: "Admin", status: "active" },
    { userId: "manager", organizationId, role: "Manager", status: "active" },
    { userId: "member", organizationId, role: "Member", status: "active" },
    { userId: "viewer", organizationId, role: "Viewer", status: "active" },
    {
      userId: "outsider",
      organizationId: otherOrganizationId,
      role: "Owner",
      status: "active",
    },
  ]);
  const ticket = await Ticket.create({
    title: "Billing question",
    customerName: "Pat Lee",
    customerEmail: "pat@example.test",
    description: "Invoice question",
    status: "Open",
    priority: "High",
    organizationId,
    creatorId: "owner",
    assigneeId: "member",
  });
  ticketId = String(ticket._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("authentication and tenant boundaries", () => {
  it("allows the configured local frontend host and its loopback alias through CORS", async () => {
    const response = await request(app)
      .options("/api/invitations")
      .set("Origin", "http://127.0.0.1:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("rejects unauthenticated and invalid authentication", async () => {
    await request(app).get("/api/organizations").expect(401);
    await request(app)
      .get("/api/organizations")
      .set("Authorization", "Bearer definitely-invalid-token")
      .expect(401);
  });

  it("rejects organizations the actor does not belong to", async () => {
    await request(app)
      .get(`/api/organizations/${organizationId}/tickets`)
      .set("Authorization", auth("outsider"))
      .expect(403);
  });

  it("rejects unauthorized organization socket subscriptions", async () => {
    const server = createServer(app);
    const socketServer = createSocketServer(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Socket test server did not start.");
    const client = socketClient(`http://127.0.0.1:${address.port}`, {
      auth: { token: "test:outsider" },
      transports: ["websocket"],
    });
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("connect_error", reject);
    });
    const result = await new Promise<{ ok: boolean; error?: string }>(
      (resolve) => {
        client.emit("organization:join", organizationId, resolve);
      },
    );
    expect(result).toEqual({
      ok: false,
      error: "Active organization membership required.",
    });
    const invalidRoomResult = await new Promise<{
      ok: boolean;
      error?: string;
    }>((resolve) => {
      client.emit("organization:join", "not-an-object-id", resolve);
    });
    expect(invalidRoomResult).toEqual({
      ok: false,
      error: "Invalid organization ID.",
    });
    client.disconnect();
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
    app.set("io", undefined);
  });

  it("removes connected sockets from organization rooms when membership is revoked", async () => {
    const server = createServer(app);
    const socketServer = createSocketServer(server);
    app.set("io", socketServer);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Socket test server did not start.");
    const client = socketClient(`http://127.0.0.1:${address.port}`, {
      auth: { token: "test:member" },
      transports: ["websocket"],
    });
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("connect_error", reject);
    });
    const joined = await new Promise<{ ok: boolean }>((resolve) => {
      client.emit("organization:join", organizationId, resolve);
    });
    expect(joined.ok).toBe(true);
    const member = await Membership.findOne({
      userId: "member",
      organizationId,
    });
    await request(app)
      .delete(`/api/organizations/${organizationId}/members/${member!.id}`)
      .set("Authorization", auth("owner"))
      .expect(204);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      await socketServer.in(`org:${organizationId}`).fetchSockets(),
    ).toHaveLength(0);
    client.disconnect();
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
    app.set("io", undefined);
  });

  it("does not disclose or modify another organization's tickets", async () => {
    await request(app)
      .get(`/api/organizations/${otherOrganizationId}/tickets`)
      .set("Authorization", auth("owner"))
      .expect(403);
    await request(app)
      .patch(`/api/organizations/${otherOrganizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("owner"))
      .send({ title: "stolen" })
      .expect(403);
  });
});

describe("RBAC and protected fields", () => {
  it("enforces the organization permission matrix for every role", async () => {
    const roles = [
      { uid: "owner", canManage: true, canReadAudit: true },
      { uid: "admin", canManage: true, canReadAudit: true },
      { uid: "manager", canManage: false, canReadAudit: true },
      { uid: "member", canManage: false, canReadAudit: false },
      { uid: "viewer", canManage: false, canReadAudit: false },
    ];

    for (const role of roles) {
      const token = auth(role.uid);
      const settings = await request(app)
        .patch(`/api/organizations/${organizationId}/settings`)
        .set("Authorization", token)
        .send({ name: `Workspace ${role.uid}` });
      expect(settings.status).toBe(role.canManage ? 200 : 403);

      const audit = await request(app)
        .get(`/api/organizations/${organizationId}/audit-logs`)
        .set("Authorization", token);
      expect(audit.status).toBe(role.canReadAudit ? 200 : 403);

      const invitation = await request(app)
        .post(`/api/organizations/${organizationId}/invitations`)
        .set("Authorization", token)
        .send({ email: `${role.uid}@example.test`, role: "Viewer" });
      expect(invitation.status).toBe(role.canManage ? 201 : 403);

      const target = await Membership.create({
        userId: `target-${role.uid}`,
        organizationId,
        role: "Member",
        status: "active",
      });
      const memberUpdate = await request(app)
        .patch(`/api/organizations/${organizationId}/members/${target.id}`)
        .set("Authorization", token)
        .send({ role: "Viewer" });
      expect(memberUpdate.status).toBe(role.canManage ? 200 : 403);
    }
  });

  it("enforces ticket and conversation create, assign, and delete permissions by role", async () => {
    const roles = [
      { uid: "owner", canCreate: true, canAssign: true, canDelete: true },
      { uid: "admin", canCreate: true, canAssign: true, canDelete: true },
      { uid: "manager", canCreate: true, canAssign: true, canDelete: true },
      { uid: "member", canCreate: true, canAssign: false, canDelete: false },
      { uid: "viewer", canCreate: false, canAssign: false, canDelete: false },
    ];
    const ticketInput = {
      title: "Permission check",
      customerName: "Taylor",
      customerEmail: "taylor@example.test",
      description: "Check role permissions.",
    };
    const conversationInput = {
      subject: "Permission check",
      customerName: "Taylor",
      customerEmail: "taylor@example.test",
    };

    for (const role of roles) {
      const token = auth(role.uid);
      const ticket = await request(app)
        .post(`/api/organizations/${organizationId}/tickets`)
        .set("Authorization", token)
        .send(ticketInput);
      expect(ticket.status).toBe(role.canCreate ? 201 : 403);

      const conversation = await request(app)
        .post(`/api/organizations/${organizationId}/conversations`)
        .set("Authorization", token)
        .send(conversationInput);
      expect(conversation.status).toBe(role.canCreate ? 201 : 403);

      const ticketToAssign = await Ticket.create({
        ...ticketInput,
        organizationId,
        creatorId: "owner",
        assigneeId: "member",
      });
      const ticketAssignment = await request(app)
        .patch(
          `/api/organizations/${organizationId}/tickets/${ticketToAssign.id}`,
        )
        .set("Authorization", token)
        .send({ assigneeId: "admin" });
      expect(ticketAssignment.status).toBe(role.canAssign ? 200 : 403);

      const conversationToAssign = await Conversation.create({
        ...conversationInput,
        organizationId,
        creatorId: "owner",
        assigneeId: "member",
      });
      const conversationAssignment = await request(app)
        .patch(
          `/api/organizations/${organizationId}/conversations/${conversationToAssign.id}`,
        )
        .set("Authorization", token)
        .send({ assigneeId: "admin" });
      expect(conversationAssignment.status).toBe(role.canAssign ? 200 : 403);

      const ticketToDelete = await Ticket.create({
        ...ticketInput,
        organizationId,
        creatorId: "owner",
      });
      const ticketDeletion = await request(app)
        .delete(
          `/api/organizations/${organizationId}/tickets/${ticketToDelete.id}`,
        )
        .set("Authorization", token);
      expect(ticketDeletion.status).toBe(role.canDelete ? 204 : 403);

      const conversationToDelete = await Conversation.create({
        ...conversationInput,
        organizationId,
        creatorId: "owner",
      });
      const conversationDeletion = await request(app)
        .delete(
          `/api/organizations/${organizationId}/conversations/${conversationToDelete.id}`,
        )
        .set("Authorization", token);
      expect(conversationDeletion.status).toBe(role.canDelete ? 204 : 403);
    }
  });

  it("limits members to updating and replying to conversations they created or are assigned", async () => {
    const ownedConversation = await Conversation.create({
      subject: "Created by member",
      customerName: "Pat",
      customerEmail: "pat@example.test",
      organizationId,
      creatorId: "member",
      assigneeId: "admin",
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/conversations/${ownedConversation.id}`,
      )
      .set("Authorization", auth("member"))
      .send({ status: "Resolved" })
      .expect(200);
    await request(app)
      .post(
        `/api/organizations/${organizationId}/conversations/${ownedConversation.id}/messages`,
      )
      .set("Authorization", auth("member"))
      .send({ body: "Reply to my conversation." })
      .expect(201);

    const assignedConversation = await Conversation.create({
      subject: "Assigned to member",
      customerName: "Ari",
      customerEmail: "ari@example.test",
      organizationId,
      creatorId: "owner",
      assigneeId: "member",
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/conversations/${assignedConversation.id}`,
      )
      .set("Authorization", auth("member"))
      .send({ status: "In Progress" })
      .expect(200);
    await request(app)
      .post(
        `/api/organizations/${organizationId}/conversations/${assignedConversation.id}/messages`,
      )
      .set("Authorization", auth("member"))
      .send({ body: "Reply to my assigned conversation." })
      .expect(201);

    const outOfScopeConversation = await Conversation.create({
      subject: "Outside member scope",
      customerName: "Sam",
      customerEmail: "sam@example.test",
      organizationId,
      creatorId: "owner",
      assigneeId: "admin",
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/conversations/${outOfScopeConversation.id}`,
      )
      .set("Authorization", auth("member"))
      .send({ status: "Closed" })
      .expect(403);
    await request(app)
      .post(
        `/api/organizations/${organizationId}/conversations/${outOfScopeConversation.id}/messages`,
      )
      .set("Authorization", auth("member"))
      .send({ body: "Out of scope." })
      .expect(403);
  });

  it("limits members to tickets assigned to or created by them", async () => {
    await request(app)
      .patch(`/api/organizations/${organizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("member"))
      .send({ status: "Resolved" })
      .expect(200);
    const unassigned = await Ticket.create({
      title: "Private",
      customerName: "Sam",
      customerEmail: "sam@example.test",
      description: "Private",
      organizationId,
      creatorId: "owner",
    });
    await request(app)
      .patch(`/api/organizations/${organizationId}/tickets/${unassigned.id}`)
      .set("Authorization", auth("member"))
      .send({ status: "Closed" })
      .expect(403);
  });

  it("keeps viewers read-only for ticket changes", async () => {
    const payload = {
      title: "Another",
      customerName: "Kim",
      customerEmail: "kim@example.test",
      description: "Help",
    };
    await request(app)
      .post(`/api/organizations/${organizationId}/tickets`)
      .set("Authorization", auth("viewer"))
      .send(payload)
      .expect(403);
    await request(app)
      .patch(`/api/organizations/${organizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("viewer"))
      .send({ status: "Closed" })
      .expect(403);
    await request(app)
      .delete(`/api/organizations/${organizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("viewer"))
      .expect(403);
    await request(app)
      .patch(`/api/organizations/${organizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("viewer"))
      .send({ assigneeId: "viewer" })
      .expect(403);
    const conversation = await Conversation.create({
      subject: "Shipping help",
      customerName: "Pat",
      customerEmail: "pat@example.test",
      organizationId,
      creatorId: "owner",
    });
    await request(app)
      .post(`/api/organizations/${organizationId}/conversations`)
      .set("Authorization", auth("viewer"))
      .send({
        subject: "New thread",
        customerName: "Sam",
        customerEmail: "sam@example.test",
      })
      .expect(403);
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/conversations/${conversation.id}`,
      )
      .set("Authorization", auth("viewer"))
      .send({ status: "Closed" })
      .expect(403);
    await request(app)
      .post(
        `/api/organizations/${organizationId}/conversations/${conversation.id}/messages`,
      )
      .set("Authorization", auth("viewer"))
      .send({ body: "Not allowed" })
      .expect(403);
    await request(app)
      .delete(
        `/api/organizations/${organizationId}/conversations/${conversation.id}`,
      )
      .set("Authorization", auth("viewer"))
      .expect(403);
  });

  it("does not let managers alter settings or membership", async () => {
    await request(app)
      .patch(`/api/organizations/${organizationId}/settings`)
      .set("Authorization", auth("manager"))
      .send({ name: "Changed" })
      .expect(403);
    await request(app)
      .post(`/api/organizations/${organizationId}/invitations`)
      .set("Authorization", auth("manager"))
      .send({ email: "new@example.test", role: "Viewer" })
      .expect(403);
  });

  it("creates email-bound invitations and accepts them only for the invited identity", async () => {
    const invitationResponse = await request(app)
      .post(`/api/organizations/${organizationId}/invitations`)
      .set("Authorization", auth("owner"))
      .send({ email: "invitee@example.test", role: "Member" })
      .expect(201);
    const duplicateInvitation = await request(app)
      .post(`/api/organizations/${organizationId}/invitations`)
      .set("Authorization", auth("owner"))
      .send({ email: "INVITEE@example.test", role: "Viewer" })
      .expect(409);
    expect(duplicateInvitation.body.error).toContain(
      "invitation is already pending",
    );
    const invitationId = invitationResponse.body.invitation._id as string;
    expect(invitationResponse.body.invitation).toMatchObject({
      email: "invitee@example.test",
      organizationId,
      role: "Member",
      invitedBy: "owner",
      status: "pending",
    });
    await request(app)
      .post("/api/organizations")
      .set("Authorization", auth("invitee"))
      .send({ name: "My own workspace" })
      .expect(409);
    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set("Authorization", auth("invitee"))
      .send({ email: "someone-else@example.test" })
      .expect(403);
    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .expect(401);
    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set("Authorization", auth("outsider"))
      .send({ email: "outsider@example.test" })
      .expect(404);
    await request(app)
      .get("/api/invitations")
      .set("Authorization", auth("invitee"))
      .expect(200);
    const acceptResponse = await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set("Authorization", "Bearer test:invitee:invitee@example.test:false")
      .send({ email: "INVITEE@example.test" })
      .expect(201);
    expect(acceptResponse.body.membership.email).toBe("invitee@example.test");
    expect(
      await Invitation.findById(invitationId).then(
        (invitation) => invitation?.status,
      ),
    ).toBe("accepted");
    const membership = await Membership.findOne({
      userId: "invitee",
      organizationId,
    });
    expect(membership?.role).toBe("Member");
    const organizations = await request(app)
      .get("/api/organizations")
      .set("Authorization", auth("invitee"))
      .expect(200);
    expect(organizations.body.organizations).toContainEqual(
      expect.objectContaining({
        _id: organizationId,
        role: "Member",
      }),
    );
    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set("Authorization", auth("invitee"))
      .expect(409);
    expect(
      await Membership.countDocuments({ userId: "invitee", organizationId }),
    ).toBe(1);
    await request(app)
      .post("/api/organizations")
      .set("Authorization", auth("invitee"))
      .send({ name: "My own workspace" })
      .expect(201);
  });

  it("finds and accepts legacy invitations when stored and authenticated email casing differs", async () => {
    const invitationId = new mongoose.Types.ObjectId();
    await Invitation.collection.insertOne({
      _id: invitationId,
      email: "Invitee@Example.Test",
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: "Admin",
      invitedBy: "owner",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const token = "Bearer test:invitee:INVITEE@example.test";
    const pending = await request(app)
      .get("/api/invitations")
      .set("Authorization", token)
      .expect(200);
    expect(pending.body.invitations).toHaveLength(1);
    expect(pending.body.invitations[0]).toMatchObject({
      email: "Invitee@Example.Test",
      role: "Admin",
      organizationId: { name: "Northstar Support" },
    });

    const accepted = await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set("Authorization", token)
      .expect(201);
    expect(accepted.body.membership.role).toBe("Admin");
    expect((await Invitation.findById(invitationId))?.status).toBe("accepted");
  });

  it("does not consume an invitation or create a duplicate membership for an existing member", async () => {
    const invitation = await Invitation.create({
      email: "member@example.test",
      organizationId,
      role: "Viewer",
      invitedBy: "owner",
      status: "pending",
    });
    await request(app)
      .post(`/api/invitations/${invitation.id}/accept`)
      .set("Authorization", auth("member"))
      .expect(409);
    expect(
      await Invitation.findById(invitation.id).then((item) => item?.status),
    ).toBe("pending");
    expect(
      await Membership.countDocuments({ userId: "member", organizationId }),
    ).toBe(1);
  });

  it("prevents admins from promoting users to Owner and forbids self-role edits", async () => {
    const ownerMembership = await Membership.findOne({
      userId: "owner",
      organizationId,
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/members/${ownerMembership!.id}`,
      )
      .set("Authorization", auth("admin"))
      .send({ role: "Viewer" })
      .expect(403);
    const adminMembership = await Membership.findOne({
      userId: "admin",
      organizationId,
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/members/${adminMembership!.id}`,
      )
      .set("Authorization", auth("admin"))
      .send({ role: "Owner" })
      .expect(403);
    const memberMembership = await Membership.findOne({
      userId: "member",
      organizationId,
    });
    await request(app)
      .patch(
        `/api/organizations/${organizationId}/members/${memberMembership!.id}`,
      )
      .set("Authorization", auth("admin"))
      .send({ role: "Owner" })
      .expect(403);
    await request(app)
      .delete(
        `/api/organizations/${organizationId}/members/${ownerMembership!.id}`,
      )
      .set("Authorization", auth("admin"))
      .expect(403);
  });

  it("does not remove the last active Owner", async () => {
    const membership = await Membership.findOne({
      userId: "owner",
      organizationId,
    });
    await request(app)
      .delete(`/api/organizations/${organizationId}/members/${membership!.id}`)
      .set("Authorization", auth("owner"))
      .expect(409);
  });

  it("allows only one of two concurrent requests to remove the final two Owners", async () => {
    await Membership.create({
      userId: "owner-two",
      email: "owner-two@example.test",
      organizationId,
      role: "Owner",
      status: "active",
    });
    await Organization.updateOne(
      { _id: organizationId },
      { activeOwnerCount: 2 },
    );
    const firstOwner = await Membership.findOne({
      userId: "owner",
      organizationId,
    });
    const secondOwner = await Membership.findOne({
      userId: "owner-two",
      organizationId,
    });
    const statuses = await Promise.all([
      request(app)
        .delete(
          `/api/organizations/${organizationId}/members/${secondOwner!.id}`,
        )
        .set("Authorization", auth("owner"))
        .then((response) => response.status),
      request(app)
        .delete(
          `/api/organizations/${organizationId}/members/${firstOwner!.id}`,
        )
        .set("Authorization", auth("owner-two"))
        .then((response) => response.status),
    ]);
    expect(statuses.sort()).toEqual([204, 409]);
    expect(
      await Membership.countDocuments({
        organizationId,
        role: "Owner",
        status: "active",
      }),
    ).toBe(1);
  });

  it("does not allow crafted protected ticket fields", async () => {
    const response = await request(app)
      .patch(`/api/organizations/${organizationId}/tickets/${ticketId}`)
      .set("Authorization", auth("owner"))
      .send({
        title: "Legitimate change",
        organizationId: otherOrganizationId,
        creatorId: "attacker",
        createdAt: "2000-01-01T00:00:00.000Z",
      })
      .expect(200);
    expect(String(response.body.ticket.organizationId)).toBe(organizationId);
    expect(response.body.ticket.creatorId).toBe("owner");
    expect(response.body.ticket.assigneeId).toBe("member");
  });

  it("does not allow crafted protected conversation fields", async () => {
    const conversation = await Conversation.create({
      subject: "Delivery question",
      customerName: "Ari",
      customerEmail: "ari@example.test",
      organizationId,
      creatorId: "owner",
    });
    const response = await request(app)
      .patch(
        `/api/organizations/${organizationId}/conversations/${conversation.id}`,
      )
      .set("Authorization", auth("owner"))
      .send({
        subject: "Updated",
        organizationId: otherOrganizationId,
        creatorId: "attacker",
      })
      .expect(200);
    expect(String(response.body.conversation.organizationId)).toBe(
      organizationId,
    );
    expect(response.body.conversation.creatorId).toBe("owner");
  });

  it("does not expose audit log update or delete operations", async () => {
    const log = await AuditLog.create({
      actorId: "owner",
      organizationId,
      action: "ticket.created",
      targetType: "Ticket",
      targetId: ticketId,
    });
    await request(app)
      .patch(`/api/organizations/${organizationId}/audit-logs/${log.id}`)
      .set("Authorization", auth("owner"))
      .send({ action: "forged" })
      .expect(404);
    await request(app)
      .delete(`/api/organizations/${organizationId}/audit-logs/${log.id}`)
      .set("Authorization", auth("owner"))
      .expect(404);
  });

  it("validates malformed payloads with safe errors", async () => {
    const response = await request(app)
      .post(`/api/organizations/${organizationId}/tickets`)
      .set("Authorization", auth("owner"))
      .send({ title: 7 })
      .expect(400);
    expect(response.body.error).toBe("Request validation failed.");
    expect(response.body.stack).toBeUndefined();
    const malformed = await request(app)
      .post(`/api/organizations/${organizationId}/tickets`)
      .set("Authorization", auth("owner"))
      .set("Content-Type", "application/json")
      .send("{invalid")
      .expect(400);
    expect(malformed.body.error).toBe("Malformed JSON request body.");
  });
});

describe("ticket filters and pagination", () => {
  it("combines status, priority, date, search, and pagination on the server", async () => {
    await Ticket.create([
      {
        title: "Filtered urgent",
        customerName: "Avery",
        customerEmail: "avery@example.test",
        description: "Important",
        status: "Open",
        priority: "Urgent",
        organizationId,
        creatorId: "owner",
        assigneeId: "member",
        createdAt: new Date("2026-01-15T18:00:00.000Z"),
      },
      {
        title: "Filtered urgent second",
        customerName: "Avery",
        customerEmail: "avery@example.test",
        description: "Also important",
        status: "Open",
        priority: "Urgent",
        organizationId,
        creatorId: "owner",
        assigneeId: "member",
        createdAt: new Date("2026-01-15T17:00:00.000Z"),
      },
    ]);
    const response = await request(app)
      .get(
        `/api/organizations/${organizationId}/tickets?status=Open&priority=Urgent&assigneeId=member&startDate=2026-01-15&endDate=2026-01-15&page=1&limit=1&search=Avery`,
      )
      .set("Authorization", auth("viewer"))
      .expect(200);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.tickets[0].title).toBe("Filtered urgent");
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      pages: 2,
    });
    const secondPage = await request(app)
      .get(
        `/api/organizations/${organizationId}/tickets?status=Open&priority=Urgent&assigneeId=member&startDate=2026-01-15&endDate=2026-01-15&page=2&limit=1&search=Avery`,
      )
      .set("Authorization", auth("viewer"))
      .expect(200);
    expect(secondPage.body.tickets).toHaveLength(1);
    expect(secondPage.body.tickets[0]._id).not.toBe(
      response.body.tickets[0]._id,
    );
  });

  it("rejects invalid or reversed date ranges", async () => {
    await request(app)
      .get(`/api/organizations/${organizationId}/tickets?startDate=not-a-date`)
      .set("Authorization", auth("owner"))
      .expect(400);
    await request(app)
      .get(`/api/organizations/${organizationId}/tickets?startDate=2026-02-31`)
      .set("Authorization", auth("owner"))
      .expect(400);
    await request(app)
      .get(
        `/api/organizations/${organizationId}/tickets?startDate=2026-02-02&endDate=2026-02-01`,
      )
      .set("Authorization", auth("owner"))
      .expect(400);
  });
});
