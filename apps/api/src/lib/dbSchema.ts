import { Prisma } from "@kanio/db";
import { env } from "../env";

/**
 * Nom du schema Postgres cible, extrait de DATABASE_URL (`?schema=...`).
 *
 * Pourquoi c'est necessaire : avec un pooler en mode transaction (PgBouncer,
 * y compris l'endpoint pooler de Neon), une connexion physique recyclee peut
 * conserver un `search_path` fixe par un CLIENT PRECEDENT (ex: la suite de
 * tests, qui se connecte avec `?schema=kanio_test`). Les requetes generees
 * par Prisma qualifient toujours leurs tables (`"public"."users"`), donc
 * elles ne sont jamais affectees. Mais nos requetes $queryRaw (verrous
 * `SELECT ... FOR UPDATE`) utilisaient des noms de table non qualifies et
 * pouvaient donc, dans de rares cas, interroger le mauvais schema et
 * renvoyer "utilisateur introuvable". Toute requete brute DOIT donc qualifier
 * ses tables via `dbTable(...)` plutot que de compter sur le search_path.
 */
function extractSchema(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return url.searchParams.get("schema") ?? "public";
  } catch {
    return "public";
  }
}

export const DB_SCHEMA = extractSchema(env.DATABASE_URL);

/** Fragment SQL brut et sur pour une table qualifiee par le schema courant. */
export function dbTable(tableName: string) {
  return Prisma.raw(`"${DB_SCHEMA}"."${tableName}"`);
}
