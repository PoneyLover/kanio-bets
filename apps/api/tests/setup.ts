import { afterAll, beforeAll } from "vitest";

// A ce stade, process.env.DATABASE_URL a deja ete injecte par vitest.config.ts
// (via `test.env`, lu depuis .env.test) - voir le commentaire dans ce fichier
// pour la raison de ce choix plutot qu'un dotenv.config() ici.
if (!process.env.DATABASE_URL?.includes("test")) {
  throw new Error(
    "Garde-fou : DATABASE_URL ne pointe pas vers une base de test. Les tests refusent de s'executer pour eviter de supprimer des donnees de developpement."
  );
}

import { prisma } from "../src/lib/prisma";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
