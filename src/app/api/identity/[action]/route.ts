import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiError,
  currentUser,
  sameOrigin,
  HttpError,
  readJson,
  rateLimit,
  clientKey,
  hashToken,
  sessionCookie,
} from "@/lib/security";
import { can } from "@/modules/access/policy";
import {
  issueAccountToken,
  redeemAccountToken,
} from "@/modules/identity/tokens";
import {
  newTotpSecret,
  sealSecret,
  openSecret,
  verifyTotp,
} from "@/modules/identity/totp";
import { consumeFactor } from "@/modules/identity/mfa";
import { passwordSchema } from "@/modules/identity/validation";
type Context = { params: Promise<{ action: string }> };
export async function GET(_req: Request, ctx: Context) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Sign in required");
    const { action } = await ctx.params;
    if (action !== "security") throw new HttpError(404, "Unknown action");
    const current = hashToken(
      (await cookies()).get(sessionCookie)?.value ?? "",
    );
    const sessions = await db.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    const events = await db.loginEvent.findMany({
      where: can(user.role, "users", "read") ? {} : { userId: user.id },
      select: {
        id: true,
        userId: true,
        success: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json(
      {
        profile: { id: user.id, name: user.name, phone: user.phone },
        mfaEnabled: !!user.mfaSecret,
        mfaConfigured: /^[a-f0-9]{64}$/i.test(
          process.env.MFA_ENCRYPTION_KEY ?? "",
        ),
        sessions: sessions.map((s) => ({ ...s, current: s.id === current })),
        events,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    if (!sameOrigin(req)) throw new HttpError(403, "Invalid origin");
    if (!(await rateLimit(`identity-ip:${clientKey(req)}`, 30, 900000)))
      throw new HttpError(429, "Try later");
    const { action } = await ctx.params;
    const body = await readJson(req);
    if (action === "redeem") {
      await redeemAccountToken(body);
      return Response.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Sign in required");
    if (!(await rateLimit(`identity-user:${user.id}`, 30, 900000)))
      throw new HttpError(429, "Try later");
    if (action === "profile") {
      const value = z
        .object({
          name: z.string().trim().min(2).max(100),
          phone: z.string().max(40),
        })
        .parse(body);
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: value });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "PROFILE_UPDATE",
            resource: "users",
            resourceId: user.id,
          },
        });
      });
    } else if (action === "revoke-session") {
      const value = z
        .object({ id: z.string().min(1), userId: z.string().optional() })
        .parse(body);
      const target = value.userId ?? user.id;
      if (target !== user.id) {
        if (!can(user.role, "users", "update"))
          throw new HttpError(403, "Admin required");
        const account = await db.user.findUnique({
          where: { id: target },
          select: { role: true },
        });
        if (account?.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN")
          throw new HttpError(403, "Owner required");
      }
      await db.$transaction(async (tx) => {
        await tx.session.deleteMany({
          where: {
            userId: target,
            ...(value.id === "all" ? {} : { id: value.id }),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "REVOKE_SESSIONS",
            resource: "users",
            resourceId: target,
          },
        });
      });
    } else {
      const value = z
        .object({
          password: z.string().min(1).max(128),
          code: z.string().max(100).default(""),
        })
        .passthrough()
        .parse(body);
      if (!(await compare(value.password, user.passwordHash)))
        throw new HttpError(401, "Current password required");
      if (action === "issue-token") {
        const target = z
          .object({ userId: z.string(), kind: z.enum(["INVITE", "RESET"]) })
          .parse(body);
        const result = await db.$transaction(async (tx) => {
          await consumeFactor(user.id, value.code, tx);
          return true;
        });
        void result;
        return Response.json(
          await issueAccountToken(user, target.userId, target.kind),
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (action === "mfa-setup") {
        if (user.mfaSecret) throw new HttpError(409, "MFA already enabled");
        if (!/^[a-f0-9]{64}$/i.test(process.env.MFA_ENCRYPTION_KEY ?? ""))
          throw new HttpError(503, "MFA encryption key must be configured");
        const secret = newTotpSecret();
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
          const account = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
          });
          if (account.authVersion !== user.authVersion || account.mfaSecret)
            throw new HttpError(409, "Account changed");
          await tx.user.update({
            where: { id: user.id },
            data: { mfaPending: sealSecret(secret) },
          });
        });
        return Response.json(
          {
            secret,
            uri: `otpauth://totp/${encodeURIComponent(`Realitna:${user.email}`)}?secret=${secret}&issuer=Realitna&algorithm=SHA1&digits=6&period=30`,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (action === "mfa-enable") {
        const codes = Array.from({ length: 8 }, () =>
          randomBytes(12).toString("hex"),
        );
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
          const account = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
          });
          if (
            account.authVersion !== user.authVersion ||
            account.mfaSecret ||
            !account.mfaPending
          )
            throw new HttpError(409, "Start MFA setup first");
          const counter = verifyTotp(
            openSecret(account.mfaPending),
            value.code,
          );
          if (counter === null)
            throw new HttpError(400, "Invalid authenticator code");
          await tx.user.update({
            where: { id: user.id },
            data: {
              mfaSecret: account.mfaPending,
              mfaPending: null,
              mfaLastCounter: BigInt(counter),
              recoveryHashes: codes.map(hashToken),
              authVersion: { increment: 1 },
            },
          });
          await tx.session.deleteMany({ where: { userId: user.id } });
          await tx.accountToken.deleteMany({ where: { userId: user.id } });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "MFA_ENABLED",
              resource: "users",
              resourceId: user.id,
            },
          });
        });
        (await cookies()).delete(sessionCookie);
        return Response.json(
          { recoveryCodes: codes, signInAgain: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (action === "password") {
        const passwordHash = await hash(
          passwordSchema.parse((body as { newPassword?: unknown }).newPassword),
          12,
        );
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
          const current = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
          });
          if (current.authVersion !== user.authVersion)
            throw new HttpError(409, "Account changed");
          await consumeFactor(user.id, value.code, tx);
          await tx.user.update({
            where: { id: user.id },
            data: { passwordHash, authVersion: { increment: 1 } },
          });
          await tx.session.deleteMany({ where: { userId: user.id } });
          await tx.accountToken.deleteMany({ where: { userId: user.id } });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "PASSWORD_CHANGED",
              resource: "users",
              resourceId: user.id,
            },
          });
        });
        (await cookies()).delete(sessionCookie);
      } else throw new HttpError(404, "Unknown action");
    }
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
