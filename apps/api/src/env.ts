import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET doit faire au moins 16 caracteres"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET doit faire au moins 16 caracteres"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  INITIAL_KANIO_BALANCE: z.coerce.number().nonnegative().default(1000),
  ADMIN_EMAIL: z.string().email().default("admin@kanio.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  ADMIN_USERNAME: z.string().default("admin"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  ODDS_MARGIN: z.coerce.number().min(0).max(0.5).default(0.06),
  ODDS_SMOOTHING_K: z.coerce.number().positive().default(50),
  ODDS_MAX_DELTA_RATIO: z.coerce.number().min(0.01).max(1).default(0.15),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration invalide (.env) :", parsed.error.flatten().fieldErrors);
  throw new Error("Variables d'environnement invalides");
}

export const env = parsed.data;
