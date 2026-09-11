import { z } from "zod";

export const placeBetSchema = z.object({
  selectionId: z.string().uuid("selectionId invalide"),
  stake: z
    .number()
    .positive("La mise doit etre positive")
    .max(1_000_000, "Mise trop elevee")
    .refine((v) => Math.round(v * 100) === v * 100, "La mise ne peut avoir plus de 2 decimales"),
});
export type PlaceBetInput = z.infer<typeof placeBetSchema>;
