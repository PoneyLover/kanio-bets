import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authRateLimit } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { AuthService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schemas";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "./auth.cookies";
import { toPublicUser } from "./user.dto";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await AuthService.register(req.body);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user: toPublicUser(user) });
  })
);

authRouter.post(
  "/login",
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: toPublicUser(user) });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Refresh token manquant" } });
    const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);
    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ user: toPublicUser(user) });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await AuthService.logout(refreshToken);
    clearAuthCookies(res);
    res.status(204).send();
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await AuthService.me(req.user!.id);
    res.json({ user: toPublicUser(user) });
  })
);
