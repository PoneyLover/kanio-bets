import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb } from "../helpers/db";
import { createUser } from "../helpers/factories";
import { loginAgent } from "../helpers/auth";

const app = createApp();

describe("Admin API - permissions et actions", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("un USER ne peut pas acceder au dashboard admin (403)", async () => {
    await createUser({ username: "plainuser", email: "plainuser@test.local" });
    const agent = await loginAgent(app, "plainuser@test.local");
    const res = await agent.get("/api/admin/dashboard");
    expect(res.status).toBe(403);
  });

  it("une requete anonyme est rejetee (401) avant meme la verification du role", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("un ADMIN peut consulter le dashboard", async () => {
    await createUser({ username: "admin", email: "admin@test.local", role: "ADMIN" });
    const agent = await loginAgent(app, "admin@test.local");
    const res = await agent.get("/api/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("usersCount");
  });

  it("credit manuel : augmente le solde, exige une justification, et journalise l'action (audit log)", async () => {
    await createUser({ username: "admin2", email: "admin2@test.local", role: "ADMIN" });
    const target = await createUser({ username: "target", email: "target@test.local", balance: 100 });
    const agent = await loginAgent(app, "admin2@test.local");

    const missingReason = await agent.post(`/api/admin/users/${target.id}/credit`).send({ amount: 50 });
    expect(missingReason.status).toBe(400);

    const res = await agent
      .post(`/api/admin/users/${target.id}/credit`)
      .send({ amount: 50, reason: "Geste commercial de bienvenue" });
    expect(res.status).toBe(201);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updated.balanceCache.toNumber()).toBe(150);

    const logs = await prisma.auditLog.findMany({ where: { targetType: "USER", targetId: target.id, action: "WALLET_CREDIT" } });
    expect(logs).toHaveLength(1);
    expect(logs[0].reason).toBe("Geste commercial de bienvenue");
  });

  it("debit manuel : refuse de rendre le solde negatif", async () => {
    await createUser({ username: "admin3", email: "admin3@test.local", role: "ADMIN" });
    const target = await createUser({ username: "target2", email: "target2@test.local", balance: 30 });
    const agent = await loginAgent(app, "admin3@test.local");

    const res = await agent
      .post(`/api/admin/users/${target.id}/debit`)
      .send({ amount: 100, reason: "Correction anti-fraude" });
    expect(res.status).toBe(422);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updated.balanceCache.toNumber()).toBe(30);
  });

  it("suspend puis reactive un utilisateur", async () => {
    await createUser({ username: "admin4", email: "admin4@test.local", role: "ADMIN" });
    const target = await createUser({ username: "target3", email: "target3@test.local" });
    const agent = await loginAgent(app, "admin4@test.local");

    const suspendRes = await agent.post(`/api/admin/users/${target.id}/suspend`).send({ reason: "Comportement suspect" });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.user.status).toBe("SUSPENDED");

    const targetAgentAttempt = await request(app)
      .post("/api/auth/login")
      .send({ email: "target3@test.local", password: "Passw0rd!" });
    expect(targetAgentAttempt.status).toBe(403);

    const reactivateRes = await agent.post(`/api/admin/users/${target.id}/reactivate`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.user.status).toBe("ACTIVE");
  });
});
