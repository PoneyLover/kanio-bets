import type { User } from "../../lib/prisma";

/** Ne jamais renvoyer passwordHash au frontend. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    balance: user.balanceCache,
    createdAt: user.createdAt,
  };
}
