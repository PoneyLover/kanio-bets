import { PrismaClient } from "../generated/client";

export * from "../generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __kanioPrisma: PrismaClient | undefined;
}

// En dev, evite de recreer une connexion Prisma a chaque hot-reload.
export const prisma: PrismaClient =
  global.__kanioPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__kanioPrisma = prisma;
}
