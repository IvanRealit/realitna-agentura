import {
  can,
  isResource,
  recordScope,
  inScope,
  isGlobal,
} from "@/modules/access/policy";
import { writeProperty } from "@/modules/properties/service";
import { db } from "@/lib/db";
import { saveUser, userSelect } from "@/modules/identity/users";
import { writeBranch, requireActiveBranch } from "@/modules/branches/service";
import { z } from "zod";
import {
  apiError,
  currentUser,
  HttpError,
  rateLimit,
  readJson,
  sameOrigin,
} from "@/lib/security";
import { contentSchema, settingsSchema } from "@/lib/validation";
import type { Prisma } from "@prisma/client";
type Context = { params: Promise<{ resource: string; id?: string[] }> };
async function access(req: Request, resource: string, write = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in required");
  if (write && !sameOrigin(req)) throw new HttpError(403, "Invalid origin");
  if (!(await rateLimit(`admin:${user.id}`, 300, 60000)))
    throw new HttpError(429, "Try again later");
  if (!isResource(resource)) throw new HttpError(404, "Unknown resource");
  const action = !write
    ? "read"
    : req.method === "POST"
      ? "create"
      : req.method === "DELETE"
        ? "delete"
        : "update";
  if (!can(user.role, resource, action))
    throw new HttpError(403, "Module permission required");
  return user;
}
export async function GET(req: Request, ctx: Context) {
  try {
    const { resource, id } = await ctx.params;
    const user = await access(req, resource);
    if (id && id.length > 1) throw new HttpError(404, "Unknown route");
    const key = id?.[0];
    let data: unknown;
    if (resource === "agents")
      data = await db.user.findMany({
        where: {
          active: true,
          ...(isGlobal(user.role)
            ? {}
            : user.branchId
              ? { branchId: user.branchId }
              : { id: user.id }),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    if (resource === "notifications") {
      const scope = recordScope(user);
      data = {
        newLeads: await db.lead.count({ where: { ...scope, status: "NEW" } }),
        latest: await db.lead.findMany({
          where: { ...scope, status: "NEW" },
          select: { id: true, name: true, kind: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      };
    }
    if (resource === "properties")
      data = await db.property.findMany({
        where: {
          AND: [
            recordScope(user),
            key ? { id: key } : {},
            new URL(req.url).searchParams.get("branchId")
              ? { branchId: new URL(req.url).searchParams.get("branchId")! }
              : {},
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });
    if (resource === "leads")
      data = await db.lead.findMany({
        where: {
          AND: [
            recordScope(user),
            key ? { id: key } : {},
            new URL(req.url).searchParams.get("branchId")
              ? { branchId: new URL(req.url).searchParams.get("branchId")! }
              : {},
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    if (resource === "users")
      data = await db.user.findMany({
        select: userSelect,
        orderBy: { name: "asc" },
        take: 200,
      });
    if (resource === "branches")
      data = await db.branch.findMany({
        where: {
          AND: [
            !isGlobal(user.role)
              ? { id: user.branchId ?? "__no_branch__" }
              : {},
            key ? { id: key } : {},
          ],
        },
        include: {
          _count: { select: { users: true, properties: true, leads: true } },
        },
        orderBy: { name: "asc" },
      });
    if (resource === "content")
      data = await db.content.findMany({
        orderBy: { updatedAt: "desc" },
        take: 200,
      });
    if (resource === "settings")
      data = await db.settings.findUnique({ where: { id: "site" } });
    if (resource === "audit")
      data = await db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    if (data === undefined)
      throw new HttpError(404, "Use the dedicated module API");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
async function mutate(
  req: Request,
  ctx: Context,
  method: "POST" | "PATCH" | "DELETE",
) {
  try {
    const { resource, id } = await ctx.params;
    if (id && id.length > 1) throw new HttpError(404, "Unknown route");
    const key = id?.[0];
    const user = await access(req, resource, true);
    if (method === "POST" && key)
      throw new HttpError(405, "Create at collection URL");
    if (method !== "POST" && !key && resource !== "settings")
      throw new HttpError(400, "Record ID required");
    if (
      resource === "audit" ||
      resource === "notifications" ||
      resource === "agents"
    )
      throw new HttpError(405, "Read only");
    const body = method === "DELETE" ? null : await readJson(req);
    if (resource === "properties") {
      const result = await writeProperty(
        user,
        method,
        key,
        body,
        req.headers.get("if-match"),
      );
      return Response.json(result, {
        status: method === "POST" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (resource === "users") {
      if (method === "DELETE")
        throw new HttpError(405, "Deactivate users instead");
      if (method === "PATCH" && !key)
        throw new HttpError(400, "User ID required");
      const result = await saveUser(user, key, body);
      return Response.json(result, {
        status: method === "POST" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (resource === "branches") {
      if (method === "DELETE")
        throw new HttpError(405, "Archive branches instead");
      if (method === "PATCH" && !key)
        throw new HttpError(400, "Branch ID required");
      const result = await writeBranch(user, key, body);
      return Response.json(result, {
        status: method === "POST" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const result = await db.$transaction(async (tx) => {
      let data: unknown;
      if (resource === "leads") {
        const existing = key
          ? await tx.lead.findUnique({ where: { id: key } })
          : null;
        if (!existing) throw new HttpError(404, "Not found");
        if (!inScope(user, existing)) throw new HttpError(403, "Not your lead");
        if (method === "DELETE") {
          if (!can(user.role, "leads", "delete"))
            throw new HttpError(403, "Admin required");
          data = await tx.lead.delete({ where: { id: key } });
        } else {
          const v = z
            .object({
              status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]),
              notes: z.string().max(10000),
              agentId: z.string().nullable().optional(),
            })
            .parse(body);
          if (
            !can(user.role, "leads", "assign") &&
            v.agentId !== undefined &&
            v.agentId !== existing.agentId
          )
            throw new HttpError(403, "Cannot reassign");
          let branchId = existing.branchId;
          if (v.agentId) {
            await tx.$queryRaw`SELECT id FROM "User" WHERE id=${v.agentId} FOR UPDATE`;
            const assigned = await tx.user.findFirst({
              where: { id: v.agentId, active: true },
              select: { branchId: true },
            });
            if (!assigned) throw new HttpError(400, "Agent unavailable");
            branchId = assigned.branchId;
            if (!inScope(user, { agentId: v.agentId, branchId }))
              throw new HttpError(403, "Assignment outside your scope");
          }
          await requireActiveBranch(tx, branchId);
          data = await tx.lead.update({
            where: { id: key },
            data: { ...v, branchId },
          });
        }
      }
      if (resource === "content") {
        if (method === "DELETE")
          data = await tx.content.delete({ where: { id: key } });
        else {
          const v = contentSchema.parse(body);
          const input = {
            ...v,
            translations: v.translations as Prisma.InputJsonValue,
            seo: (v.seo ?? {}) as Prisma.InputJsonValue,
          };
          data = key
            ? await tx.content.update({ where: { id: key }, data: input })
            : await tx.content.create({ data: input });
        }
      }
      if (resource === "settings") {
        if (method === "DELETE")
          throw new HttpError(405, "Cannot delete settings");
        const v = settingsSchema.parse(body);
        data = await tx.settings.upsert({
          where: { id: "site" },
          create: { id: "site", ...v },
          update: v,
        });
      }
      if (!data) throw new HttpError(405, "Unsupported operation");
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: method,
          resource,
          resourceId: key ?? (data as { id?: string }).id ?? "site",
        },
      });
      return data;
    });
    return Response.json(result, { status: method === "POST" ? 201 : 200 });
  } catch (e) {
    return apiError(e);
  }
}
export const POST = (r: Request, c: Context) => mutate(r, c, "POST");
export const PATCH = (r: Request, c: Context) => mutate(r, c, "PATCH");
export const DELETE = (r: Request, c: Context) => mutate(r, c, "DELETE");
