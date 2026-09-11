import jwt from "jsonwebtoken";
import { env } from "../env";

export interface AccessTokenPayload {
  sub: string; // userId
  role: "USER" | "ADMIN";
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // identifiant unique du refresh token (correle a RefreshToken.id en base)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

function ttlStringToMs(ttl: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}

/** Duree du refresh token en millisecondes, utilisee pour l'expiration en base et le cookie. */
export function refreshTtlMs(): number {
  return ttlStringToMs(env.JWT_REFRESH_TTL, 7 * 24 * 60 * 60 * 1000);
}

/** Duree de l'access token en millisecondes, utilisee pour le cookie. */
export function accessTtlMs(): number {
  return ttlStringToMs(env.JWT_ACCESS_TTL, 15 * 60 * 1000);
}
