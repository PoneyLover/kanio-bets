import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import type { AuthUser } from "./auth.middleware";

export function requireRole(...roles: Array<AuthUser["role"]>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden("Role insuffisant pour cette action"));
    }
    next();
  };
}
