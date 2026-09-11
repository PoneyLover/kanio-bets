import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb } from "../helpers/db";
import { createUser } from "../helpers/factories";

const app = createApp();

describe("Auth API", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("POST /api/auth/register cree un compte avec le solde initial configure", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "newuser", email: "newuser@test.local", password: "Passw0rd1" });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("newuser");
    expect(Number(res.body.user.balance)).toBe(1000); // INITIAL_KANIO_BALANCE du .env.test
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("refuse un email deja utilise (409)", async () => {
    await createUser({ username: "existing", email: "dup@test.local" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "someoneelse", email: "dup@test.local", password: "Passw0rd1" });
    expect(res.status).toBe(409);
  });

  it("refuse un mot de passe trop faible (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "weakpass", email: "weak@test.local", password: "weak" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login refuse un mauvais mot de passe (401)", async () => {
    await createUser({ username: "loginuser", email: "login@test.local", password: "Passw0rd1" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@test.local", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login refuse un compte suspendu (403)", async () => {
    const user = await createUser({ username: "suspended", email: "suspended@test.local", password: "Passw0rd1" });
    const { prisma } = await import("../../src/lib/prisma");
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });

    const res = await request(app).post("/api/auth/login").send({ email: "suspended@test.local", password: "Passw0rd1" });
    expect(res.status).toBe(403);
  });

  it("GET /api/auth/me exige d'etre authentifie (401 sans cookie)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me fonctionne avec le cookie de session apres login", async () => {
    const agent = request.agent(app);
    await createUser({ username: "meuser", email: "me@test.local", password: "Passw0rd1" });
    await agent.post("/api/auth/login").send({ email: "me@test.local", password: "Passw0rd1" });

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@test.local");
  });
});
