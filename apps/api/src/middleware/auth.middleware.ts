import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthUser {
  id: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  username: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.kanio_access_token;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/** Verifie le JWT et charge l'utilisateur courant. Rejette les comptes suspendus. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppError.unauthorized("Utilisateur introuvable");
    if (user.status === "SUSPENDED") {
      throw AppError.forbidden("Compte suspendu");
    }

    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      username: user.username,
      email: user.email,
    };
    next();
  } catch {
    next(AppError.unauthorized());
  }
}

/** Comme requireAuth, mais ne rejette pas si aucun token n'est present. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.status === "ACTIVE") {
      req.user = {
        id: user.id,
        role: user.role,
        status: user.status,
        username: user.username,
        email: user.email,
      };
    }
  } catch {
    // token invalide -> requete anonyme
  }
  next();
}
