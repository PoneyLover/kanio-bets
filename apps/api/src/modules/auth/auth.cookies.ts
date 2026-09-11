import type { Response } from "express";
import { env } from "../../env";
import { accessTtlMs, refreshTtlMs } from "../../utils/jwt";

const ACCESS_COOKIE = "kanio_access_token";
const REFRESH_COOKIE = "kanio_refresh_token";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // SameSite=None est necessaire quand front et API sont sur des domaines
    // differents (ex: Vercel + Render) ; exige `secure: true` (HTTPS).
    sameSite: (env.COOKIE_SECURE ? "none" : "lax") as "none" | "lax",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookieOptions(), maxAge: accessTtlMs() });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookieOptions(), maxAge: refreshTtlMs() });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
