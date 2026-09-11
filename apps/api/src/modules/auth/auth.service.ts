import { randomUUID, createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../env";
import { AppError } from "../../utils/AppError";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  refreshTtlMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import type { RegisterInput, LoginInput } from "./auth.schemas";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokenPair(userId: string, role: "USER" | "ADMIN") {
  const accessToken = signAccessToken({ sub: userId, role });

  const jti = randomUUID();
  const refreshToken = signRefreshToken({ sub: userId, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashToken(jti),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken };
}

export const AuthService = {
  async register(input: RegisterInput) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw AppError.conflict("Cet email est deja utilise");
    const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
    if (existingUsername) throw AppError.conflict("Ce nom d'utilisateur est deja pris");

    const passwordHash = await hashPassword(input.password);
    const initialBalance = env.INITIAL_KANIO_BALANCE;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash,
          balanceCache: initialBalance,
        },
      });
      await tx.walletTransaction.create({
        data: {
          userId: created.id,
          type: "INITIAL_BALANCE",
          amount: initialBalance,
          balanceBefore: 0,
          balanceAfter: initialBalance,
          description: "Solde initial de bienvenue en KANIO (KAN)",
        },
      });
      return created;
    });

    const tokens = await issueTokenPair(user.id, user.role);
    return { user, ...tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw AppError.unauthorized("Identifiants invalides");

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) throw AppError.unauthorized("Identifiants invalides");

    if (user.status === "SUSPENDED") throw AppError.forbidden("Compte suspendu");

    const tokens = await issueTokenPair(user.id, user.role);
    return { user, ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Refresh token invalide ou expire");
    }

    const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!record || record.revokedAt || record.tokenHash !== hashToken(payload.jti) || record.expiresAt < new Date()) {
      throw AppError.unauthorized("Session expiree, merci de vous reconnecter");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "SUSPENDED") throw AppError.unauthorized();

    // Rotation : on revoque l'ancien refresh token et on en emet un nouveau.
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokenPair(user.id, user.role);
    return { user, ...tokens };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // token deja invalide : rien a faire
    }
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("Utilisateur introuvable");
    return user;
  },
};
