import rateLimit from "express-rate-limit";

/** Limite generale sur toute l'API. */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limite stricte sur les routes sensibles (login/register) pour freiner le brute-force. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives, reessayez plus tard" } },
});

/** Limite sur le placement de paris pour eviter les scripts spammant l'API. */
export const betRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de paris places, ralentissez" } },
});
