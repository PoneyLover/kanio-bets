import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "3 caracteres minimum")
    .max(24, "24 caracteres maximum")
    .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et underscore uniquement"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "8 caracteres minimum")
    .max(128)
    .regex(/[a-z]/, "Au moins une minuscule")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;
