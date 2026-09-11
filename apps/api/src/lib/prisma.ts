export { prisma, Prisma } from "@kanio/db";

/**
 * Options par defaut pour les transactions interactives Prisma multi-requetes
 * (placement de pari, settlement...). Le timeout par defaut de Prisma (5s) est
 * trop court sur l'hebergement gratuit (Render + Neon) : une transaction qui
 * enchaine une dizaine de requetes peut le depasser en cas de latence reseau
 * ou de reveil a froid de la base, ce qui la fait fermer prematurement
 * (erreur Prisma P2028) alors qu'elle etait toujours en cours d'execution.
 */
export const TX_OPTIONS = { timeout: 15000, maxWait: 10000 };
export type {
  User,
  UserRole,
  UserStatus,
  WalletTransaction,
  TransactionType,
  Sport,
  Competition,
  Participant,
  Event,
  EventStatus,
  Market,
  MarketType,
  MarketStatus,
  Selection,
  SelectionResult,
  OddsHistory,
  Bet,
  BetType,
  BetStatus,
  BetSelection,
  AuditLog,
  AuditAction,
  PrismaClient,
} from "@kanio/db";
