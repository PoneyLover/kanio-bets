import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "./AppError";

type Source = "body" | "query" | "params";

/** Valide et remplace req[source] par la version parsee/typee du schema Zod. */
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(AppError.badRequest("Donnees invalides", result.error.flatten()));
    }
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
