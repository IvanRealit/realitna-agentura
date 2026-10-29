import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Role } from "@prisma/client";
import { can, ownsRecord } from "@/modules/access/policy";
export const sessionCookie = "realitna_session";
export const hashToken = (v: string) =>
  createHash("sha256").update(v).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() && session.user.active
    ? session.user
    : null;
}
export async function newSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        id: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + 8 * 3600000),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "LOGIN",
        resource: "session",
        resourceId: userId,
      },
    });
  });
  return token;
}
export function cookieOptions() {
  return {
    httpOnly: true,
    secure:
      new URL(process.env.SITE_URL ?? "http://localhost:3000").protocol ===
        "https:" ||
      (process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 8 * 3600,
  };
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return (
    origin === new URL(process.env.SITE_URL ?? "http://localhost:3000").origin
  );
}
export function canManage(role: Role) {
  return can(role, "properties", "publish");
}
export function owns(role: Role, userId: string, agentId: string | null) {
  return ownsRecord(role, userId, agentId);
}
export async function rateLimit(key: string, max: number, windowMs: number) {
  const now = new Date();
  // Atomic PostgreSQL upsert; works across application instances.
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES (${hashToken(key)},1,${new Date(Date.now() + windowMs)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${new Date(Date.now() + windowMs)} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  return rows[0].count <= max;
}
export function clientKey(req: Request) {
  return process.env.TRUST_PROXY === "true"
    ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")
    : "shared";
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message, ...(error.code ? { code: error.code } : {}) },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error && typeof error === "object" && "issues" in error)
    return Response.json(
      { error: "Invalid input", issues: error.issues },
      { status: 400 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return Response.json(
      { error: "A record with this slug or email already exists" },
      { status: 409 },
    );
  console.error(
    "API operation failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json({ error: "Operation failed" }, { status: 500 });
}
export async function readBodyLimited(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "Payload too large");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
export async function readJson(req: Request) {
  const raw = new TextDecoder().decode(await readBodyLimited(req, 200000));
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
