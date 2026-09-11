import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EventsService } from "./events.service";

export const eventsRouter = Router();

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const sportKey = typeof req.query.sport === "string" ? req.query.sport : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const events = await EventsService.listEvents({ sportKey, status });
    res.json({ events });
  })
);

eventsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const event = await EventsService.getEventById(req.params.id);
    res.json({ event });
  })
);
