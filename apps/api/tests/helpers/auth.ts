import request from "supertest";
import type { Express } from "express";

export async function loginAgent(app: Express, email: string, password = "Passw0rd!") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}
