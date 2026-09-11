/**
 * Seed de demonstration KANIO.
 * Idempotent (upsert) - peut etre relance sans dupliquer les donnees.
 */
import * as argon2 from "argon2";
import { PrismaClient, UserRole } from "../generated/client";

const prisma = new PrismaClient();

const INITIAL_KANIO_BALANCE = Number(process.env.INITIAL_KANIO_BALANCE ?? 1000);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kanio.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const DEMO_PASSWORD = "Demo1234!";

async function upsertUserWithWallet(params: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  initialBalance: number;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) return existing;

  const passwordHash = await argon2.hash(params.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: params.username,
        email: params.email,
        passwordHash,
        role: params.role,
        balanceCache: params.initialBalance,
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: user.id,
        type: "INITIAL_BALANCE",
        amount: params.initialBalance,
        balanceBefore: 0,
        balanceAfter: params.initialBalance,
        description: "Solde initial de bienvenue en KANIO (KAN)",
      },
    });

    return user;
  });
}

async function upsertSelection(
  marketId: string,
  label: string,
  outcomeKey: string,
  odds: number
) {
  return prisma.selection.upsert({
    where: { marketId_outcomeKey: { marketId, outcomeKey } },
    update: { label, currentOdds: odds },
    create: {
      marketId,
      label,
      outcomeKey,
      currentOdds: odds,
      minOdds: 1.05,
      maxOdds: 15,
    },
  });
}

async function main() {
  console.log("Seed KANIO - demarrage...");

  // --- Compte admin ---
  await upsertUserWithWallet({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "ADMIN",
    initialBalance: INITIAL_KANIO_BALANCE,
  });
  console.log(`Admin pret : ${ADMIN_EMAIL}`);

  // --- Comptes de demonstration ---
  const demoUsers = [
    { username: "demo_alice", email: "alice@kanio.local" },
    { username: "demo_bob", email: "bob@kanio.local" },
    { username: "demo_chloe", email: "chloe@kanio.local" },
    { username: "demo_daniel", email: "daniel@kanio.local" },
  ];
  for (const u of demoUsers) {
    await upsertUserWithWallet({
      ...u,
      password: DEMO_PASSWORD,
      role: "USER",
      initialBalance: INITIAL_KANIO_BALANCE,
    });
  }
  console.log(`${demoUsers.length} comptes de demonstration prets (mot de passe: ${DEMO_PASSWORD})`);

  // --- Sports & competitions ---
  const football = await prisma.sport.upsert({
    where: { key: "football" },
    update: {},
    create: { key: "football", name: "Football" },
  });
  const basketball = await prisma.sport.upsert({
    where: { key: "basketball" },
    update: {},
    create: { key: "basketball", name: "Basketball" },
  });

  const ligue1 = await prisma.competition.upsert({
    where: { id: "seed-ligue1" },
    update: {},
    create: { id: "seed-ligue1", sportId: football.id, name: "Ligue 1", country: "France" },
  });
  const nba = await prisma.competition.upsert({
    where: { id: "seed-nba" },
    update: {},
    create: { id: "seed-nba", sportId: basketball.id, name: "NBA", country: "USA" },
  });

  // --- Equipes ---
  const teamNames = [
    "PSG",
    "Marseille",
    "Lyon",
    "Monaco",
    "Lille",
    "Lakers",
    "Celtics",
  ];
  const teams: Record<string, { id: string }> = {};
  for (const name of teamNames) {
    const existing = await prisma.participant.findFirst({ where: { name } });
    teams[name] = existing ?? (await prisma.participant.create({ data: { name } }));
  }

  // --- Evenement 1 : PSG vs Marseille (ouvert aux paris) ---
  const now = Date.now();
  const event1 = await prisma.event.upsert({
    where: { id: "seed-event-psg-om" },
    update: {},
    create: {
      id: "seed-event-psg-om",
      competitionId: ligue1.id,
      homeParticipantId: teams["PSG"].id,
      awayParticipantId: teams["Marseille"].id,
      startTime: new Date(now + 1000 * 60 * 60 * 24 * 2), // dans 2 jours
      status: "OPEN",
    },
  });

  const market1 = await prisma.market.upsert({
    where: { id: "seed-market-psg-om-1x2" },
    update: {},
    create: {
      id: "seed-market-psg-om-1x2",
      eventId: event1.id,
      type: "MATCH_WINNER",
      name: "Vainqueur du match",
      status: "OPEN",
    },
  });
  await upsertSelection(market1.id, "PSG", "HOME", 1.8);
  await upsertSelection(market1.id, "Nul", "DRAW", 3.5);
  await upsertSelection(market1.id, "Marseille", "AWAY", 4.2);

  const market1b = await prisma.market.upsert({
    where: { id: "seed-market-psg-om-ou25" },
    update: {},
    create: {
      id: "seed-market-psg-om-ou25",
      eventId: event1.id,
      type: "OVER_UNDER",
      name: "Total buts +/- 2.5",
      line: 2.5,
      status: "OPEN",
    },
  });
  await upsertSelection(market1b.id, "Plus de 2.5 buts", "OVER", 1.95);
  await upsertSelection(market1b.id, "Moins de 2.5 buts", "UNDER", 1.85);

  // --- Evenement 2 : Lyon vs Monaco (ouvert) ---
  const event2 = await prisma.event.upsert({
    where: { id: "seed-event-lyon-monaco" },
    update: {},
    create: {
      id: "seed-event-lyon-monaco",
      competitionId: ligue1.id,
      homeParticipantId: teams["Lyon"].id,
      awayParticipantId: teams["Monaco"].id,
      startTime: new Date(now + 1000 * 60 * 60 * 24 * 3),
      status: "OPEN",
    },
  });
  const market2 = await prisma.market.upsert({
    where: { id: "seed-market-lyon-monaco-1x2" },
    update: {},
    create: {
      id: "seed-market-lyon-monaco-1x2",
      eventId: event2.id,
      type: "MATCH_WINNER",
      name: "Vainqueur du match",
      status: "OPEN",
    },
  });
  await upsertSelection(market2.id, "Lyon", "HOME", 2.1);
  await upsertSelection(market2.id, "Nul", "DRAW", 3.3);
  await upsertSelection(market2.id, "Monaco", "AWAY", 3.4);

  // --- Evenement 3 : Lille vs PSG, deja termine, en attente de reglement admin ---
  const event3 = await prisma.event.upsert({
    where: { id: "seed-event-lille-psg" },
    update: {},
    create: {
      id: "seed-event-lille-psg",
      competitionId: ligue1.id,
      homeParticipantId: teams["Lille"].id,
      awayParticipantId: teams["PSG"].id,
      startTime: new Date(now - 1000 * 60 * 60 * 3),
      status: "FINISHED",
      resultPayload: { homeScore: 1, awayScore: 2 },
    },
  });
  const market3 = await prisma.market.upsert({
    where: { id: "seed-market-lille-psg-1x2" },
    update: {},
    create: {
      id: "seed-market-lille-psg-1x2",
      eventId: event3.id,
      type: "MATCH_WINNER",
      name: "Vainqueur du match",
      status: "CLOSED",
    },
  });
  await upsertSelection(market3.id, "Lille", "HOME", 2.9);
  await upsertSelection(market3.id, "Nul", "DRAW", 3.2);
  await upsertSelection(market3.id, "PSG", "AWAY", 2.3);

  // --- Evenement 4 : Lakers vs Celtics (basketball, ouvert) ---
  const event4 = await prisma.event.upsert({
    where: { id: "seed-event-lakers-celtics" },
    update: {},
    create: {
      id: "seed-event-lakers-celtics",
      competitionId: nba.id,
      homeParticipantId: teams["Lakers"].id,
      awayParticipantId: teams["Celtics"].id,
      startTime: new Date(now + 1000 * 60 * 60 * 24),
      status: "OPEN",
    },
  });
  const market4 = await prisma.market.upsert({
    where: { id: "seed-market-lakers-celtics-1x2" },
    update: {},
    create: {
      id: "seed-market-lakers-celtics-1x2",
      eventId: event4.id,
      type: "MATCH_WINNER",
      name: "Vainqueur du match",
      status: "OPEN",
    },
  });
  await upsertSelection(market4.id, "Lakers", "HOME", 1.65);
  await upsertSelection(market4.id, "Celtics", "AWAY", 2.25);

  console.log("Seed KANIO - termine avec succes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
