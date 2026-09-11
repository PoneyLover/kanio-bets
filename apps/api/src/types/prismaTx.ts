import type { Prisma, PrismaClient } from "@kanio/db";

/** Client Prisma utilisable a l'interieur d'un prisma.$transaction(...). */
export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export type PrismaTransactionClient = Prisma.TransactionClient;
