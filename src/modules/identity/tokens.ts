import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken, HttpError } from "@/lib/security";
import { can, type Actor } from "@/modules/access/policy";
import { passwordSchema } from "./validation";
import { consumeFactor } from "./mfa";
export async function issueAccountToken(
  actor: Actor,
  userId: string,
  kind: "INVITE" | "RESET",
) {
  if (!can(actor.role, "users", "update"))
    throw new HttpError(403, "User administration required");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + (kind === "INVITE" ? 86400000 : 3600000),
  );
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new HttpError(404, "User not found");
    if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN")
      throw new HttpError(403, "Owner required");
    if (kind === "INVITE" && target.active)
      throw new HttpError(409, "Invitations require an inactive account");
    if (kind === "RESET" && !target.active)
      throw new HttpError(409, "Blocked accounts cannot reset a password");
    await tx.accountToken.deleteMany({ where: { userId } });
    await tx.accountToken.create({
      data: {
        id: hashToken(token),
        userId,
        kind,
        authVersion: target.authVersion,
        expiresAt,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: `ISSUE_${kind}`,
        resource: "users",
        resourceId: userId,
      },
    });
  });
  return { token, expiresAt, delivery: "MANUAL_SECURE_CHANNEL" };
}
export async function redeemAccountToken(body: unknown) {
  const v = z
    .object({
      token: z.string().min(40).max(100),
      password: passwordSchema,
      code: z.string().max(100).default(""),
    })
    .parse(body);
  const passwordHash = await hash(v.password, 12);
  await db.$transaction(async (tx) => {
    const token = await tx.accountToken.findUnique({
      where: { id: hashToken(v.token) },
    });
    if (!token || token.expiresAt <= new Date())
      throw new HttpError(400, "Invalid or expired token");
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${token.userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: token.userId },
    });
    if (
      user.authVersion !== token.authVersion ||
      (!user.active && token.kind !== "INVITE")
    )
      throw new HttpError(400, "Invalid token");
    if (
      (
        await tx.accountToken.deleteMany({
          where: { id: token.id, expiresAt: { gt: new Date() } },
        })
      ).count !== 1
    )
      throw new HttpError(400, "Token already used");
    await consumeFactor(user.id, v.code, tx);
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, active: true, authVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.accountToken.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `REDEEM_${token.kind}`,
        resource: "users",
        resourceId: user.id,
      },
    });
  });
}
