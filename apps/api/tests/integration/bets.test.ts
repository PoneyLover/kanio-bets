import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb } from "../helpers/db";
import { createOpenMatchWinnerEvent, createUser } from "../helpers/factories";
import { loginAgent } from "../helpers/auth";

const app = createApp();

describe("Bets API", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("place un pari simple, debite le solde et calcule le gain potentiel a partir de la cote figee", async () => {
    await createUser({ username: "bettor", email: "bettor@test.local", balance: 500 });
    const { homeSel } = await createOpenMatchWinnerEvent(1.8, 3.5, 4.2);
    const agent = await loginAgent(app, "bettor@test.local");

    const res = await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 100 });

    expect(res.status).toBe(201);
    expect(Number(res.body.bet.stake)).toBe(100);
    expect(Number(res.body.bet.totalOdds)).toBe(1.8);
    expect(Number(res.body.bet.potentialPayout)).toBe(180);

    const wallet = await agent.get("/api/wallet");
    expect(Number(wallet.body.balance)).toBe(400);
  });

  it("refuse un pari si le solde est insuffisant et ne modifie pas le solde (422)", async () => {
    await createUser({ username: "poor", email: "poor@test.local", balance: 50 });
    const { homeSel } = await createOpenMatchWinnerEvent();
    const agent = await loginAgent(app, "poor@test.local");

    const res = await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 100 });
    expect(res.status).toBe(422);

    const wallet = await agent.get("/api/wallet");
    expect(Number(wallet.body.balance)).toBe(50);
  });

  it("refuse un pari sur un marche suspendu (409)", async () => {
    await createUser({ username: "u2", email: "u2@test.local", balance: 500 });
    const { market, homeSel } = await createOpenMatchWinnerEvent();
    await prisma.market.update({ where: { id: market.id }, data: { status: "SUSPENDED" } });
    const agent = await loginAgent(app, "u2@test.local");

    const res = await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 10 });
    expect(res.status).toBe(409);
  });

  it("refuse un pari sur un evenement ferme (409)", async () => {
    await createUser({ username: "u3", email: "u3@test.local", balance: 500 });
    const { event, homeSel } = await createOpenMatchWinnerEvent();
    await prisma.event.update({ where: { id: event.id }, data: { status: "CLOSED" } });
    const agent = await loginAgent(app, "u3@test.local");

    const res = await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 10 });
    expect(res.status).toBe(409);
  });

  it("404 sur une selection inexistante", async () => {
    await createUser({ username: "u4", email: "u4@test.local", balance: 500 });
    const agent = await loginAgent(app, "u4@test.local");
    const res = await agent.post("/api/bets").send({ selectionId: "00000000-0000-0000-0000-000000000000", stake: 10 });
    expect(res.status).toBe(404);
  });

  it("refuse une mise negative ou nulle (400)", async () => {
    await createUser({ username: "u5", email: "u5@test.local", balance: 500 });
    const { homeSel } = await createOpenMatchWinnerEvent();
    const agent = await loginAgent(app, "u5@test.local");
    const res = await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: -10 });
    expect(res.status).toBe(400);
  });

  it("gere la concurrence : deux paris simultanes qui depassent le solde combine, un seul doit passer", async () => {
    await createUser({ username: "concurrent", email: "concurrent@test.local", balance: 100 });
    const { homeSel } = await createOpenMatchWinnerEvent();
    const agent = await loginAgent(app, "concurrent@test.local");

    const [r1, r2] = await Promise.all([
      agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 70 }),
      agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 70 }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 422]);

    const wallet = await agent.get("/api/wallet");
    expect(Number(wallet.body.balance)).toBeGreaterThanOrEqual(0);
    expect(Number(wallet.body.balance)).toBe(30);
  });

  it("recalcule la cote de la selection apres le pari (historique OddsHistory alimente)", async () => {
    await createUser({ username: "oddsuser", email: "oddsuser@test.local", balance: 100_000 });
    const { homeSel } = await createOpenMatchWinnerEvent(1.8, 3.5, 4.2);
    const agent = await loginAgent(app, "oddsuser@test.local");

    await agent.post("/api/bets").send({ selectionId: homeSel.id, stake: 50_000 });

    const updatedSelection = await prisma.selection.findUniqueOrThrow({ where: { id: homeSel.id } });
    expect(updatedSelection.currentOdds.toNumber()).toBeLessThan(1.8);

    const history = await prisma.oddsHistory.findMany({ where: { selectionId: homeSel.id } });
    expect(history.length).toBeGreaterThan(0);
  });
});
