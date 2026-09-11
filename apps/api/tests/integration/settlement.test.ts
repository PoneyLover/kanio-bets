import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb } from "../helpers/db";
import { createOpenMatchWinnerEvent, createUser } from "../helpers/factories";
import { loginAgent } from "../helpers/auth";

const app = createApp();

async function placeBet(agent: Awaited<ReturnType<typeof loginAgent>>, selectionId: string, stake: number) {
  const res = await agent.post("/api/bets").send({ selectionId, stake });
  expect(res.status).toBe(201);
  return res.body.bet;
}

describe("Settlement API", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("credite les gagnants et debite (comptablement) les perdants quand l'admin regle l'evenement", async () => {
    await createUser({ username: "admin", email: "admin@test.local", role: "ADMIN", balance: 0 });
    await createUser({ username: "winner", email: "winner@test.local", balance: 1000 });
    await createUser({ username: "loser", email: "loser@test.local", balance: 1000 });
    const { event, homeSel, awaySel } = await createOpenMatchWinnerEvent(2, 3, 4);

    const winnerAgent = await loginAgent(app, "winner@test.local");
    const loserAgent = await loginAgent(app, "loser@test.local");
    await placeBet(winnerAgent, homeSel.id, 100); // parie sur HOME
    await placeBet(loserAgent, awaySel.id, 100); // parie sur AWAY

    const adminAgent = await loginAgent(app, "admin@test.local");
    const settleRes = await adminAgent.post(`/api/admin/events/${event.id}/settle`).send({ homeScore: 2, awayScore: 0 });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.wonCount).toBe(1);
    expect(settleRes.body.lostCount).toBe(1);

    const winnerWallet = await winnerAgent.get("/api/wallet");
    expect(Number(winnerWallet.body.balance)).toBe(1000 - 100 + 200); // mise rendue + gain (cote 2)

    const loserWallet = await loserAgent.get("/api/wallet");
    expect(Number(loserWallet.body.balance)).toBe(900); // mise perdue, pas de credit
  });

  it("le settlement est idempotent : un second appel echoue et ne paie pas deux fois", async () => {
    await createUser({ username: "admin2", email: "admin2@test.local", role: "ADMIN" });
    await createUser({ username: "winner2", email: "winner2@test.local", balance: 1000 });
    const { event, homeSel } = await createOpenMatchWinnerEvent(2, 3, 4);

    const winnerAgent = await loginAgent(app, "winner2@test.local");
    await placeBet(winnerAgent, homeSel.id, 100);

    const adminAgent = await loginAgent(app, "admin2@test.local");
    const first = await adminAgent.post(`/api/admin/events/${event.id}/settle`).send({ homeScore: 1, awayScore: 0 });
    expect(first.status).toBe(200);

    const balanceAfterFirst = (await winnerAgent.get("/api/wallet")).body.balance;

    const second = await adminAgent.post(`/api/admin/events/${event.id}/settle`).send({ homeScore: 1, awayScore: 0 });
    expect(second.status).toBe(409);

    const balanceAfterSecond = (await winnerAgent.get("/api/wallet")).body.balance;
    expect(Number(balanceAfterSecond)).toBe(Number(balanceAfterFirst));
  });

  it("rembourse integralement les paris en attente quand l'evenement est annule", async () => {
    await createUser({ username: "admin3", email: "admin3@test.local", role: "ADMIN" });
    await createUser({ username: "bettor3", email: "bettor3@test.local", balance: 1000 });
    const { event, homeSel } = await createOpenMatchWinnerEvent();

    const bettorAgent = await loginAgent(app, "bettor3@test.local");
    await placeBet(bettorAgent, homeSel.id, 150);
    const balanceAfterBet = Number((await bettorAgent.get("/api/wallet")).body.balance);
    expect(balanceAfterBet).toBe(850);

    const adminAgent = await loginAgent(app, "admin3@test.local");
    const cancelRes = await adminAgent.post(`/api/admin/events/${event.id}/cancel`).send({ reason: "Match reporte" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.refundedCount).toBe(1);

    const balanceAfterCancel = Number((await bettorAgent.get("/api/wallet")).body.balance);
    expect(balanceAfterCancel).toBe(1000);

    const bet = await prisma.bet.findFirst({ where: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: "bettor3@test.local" } })).id } });
    expect(bet?.status).toBe("REFUNDED");
  });

  it("un utilisateur USER ne peut pas regler un evenement (403)", async () => {
    await createUser({ username: "notadmin", email: "notadmin@test.local" });
    const { event } = await createOpenMatchWinnerEvent();
    const agent = await loginAgent(app, "notadmin@test.local");
    const res = await agent.post(`/api/admin/events/${event.id}/settle`).send({ homeScore: 1, awayScore: 0 });
    expect(res.status).toBe(403);
  });
});
