import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/roles.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuditService } from "./audit.service";
import { adminUsersRouter } from "./admin.users.routes";
import { adminEventsRouter, adminMarketsRouter } from "./admin.events.routes";
import { adminDashboardRouter } from "./admin.dashboard.routes";
import { adminMetaRouter } from "./admin.meta.routes";

export const adminRouter = Router();

// Toutes les routes /api/admin/* exigent d'etre authentifie ET d'avoir le role ADMIN.
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.use("/dashboard", adminDashboardRouter);
adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/events", adminEventsRouter);
adminRouter.use("/markets", adminMarketsRouter);
adminRouter.use("/meta", adminMetaRouter);

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
    const logs = await AuditService.list({ targetType });
    res.json({ logs });
  })
);
