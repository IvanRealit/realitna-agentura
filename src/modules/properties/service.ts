import { requireActiveBranch } from "@/modules/branches/service";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { propertySchema } from "@/lib/validation";
import { can, inScope } from "@/modules/access/policy";
import { expectedVersion, publicationIssues } from "./rules";
type Actor = { id: string; role: Role; branchId?: string | null };
type Method = "POST" | "PATCH" | "DELETE";
export async function writeProperty(
  actor: Actor,
  method: Method,
  id: string | undefined,
  body: unknown,
  ifMatch: string | null,
) {
  const action =
    method === "POST" ? "create" : method === "PATCH" ? "update" : "delete";
  if (!can(actor.role, "properties", action))
    throw new HttpError(403, "Property permission required");
  if (method === "POST" && id)
    throw new HttpError(405, "Create at the collection URL");
  if (method !== "POST" && !id)
    throw new HttpError(400, "Property ID is required");
  return db.$transaction(async (tx) => {
    const existing = id
      ? await tx.property.findUnique({ where: { id } })
      : null;
    if (id && !existing) throw new HttpError(404, "Property not found");
    if (existing && !inScope(actor, existing))
      throw new HttpError(403, "Not your property");
    let result;
    if (method === "DELETE") {
      const version = expectedVersion(body, ifMatch);
      const removed = await tx.property.deleteMany({
        where: { id: id!, version },
      });
      if (removed.count !== 1)
        throw new HttpError(
          409,
          "This record was changed by another user. Your changes were not applied.",
          "VERSION_CONFLICT",
        );
      result = existing!;
    } else {
      const v = propertySchema.parse(body);
      if (!can(actor.role, "properties", "publish")) {
        if (!can(actor.role, "properties", "assign") && v.agentId !== actor.id)
          throw new HttpError(403, "Cannot assign another agent");
        if (existing && !["DRAFT", "REVIEW"].includes(existing.status))
          throw new HttpError(
            403,
            "Ask a manager to return this published record to draft before changing it.",
          );
        if (
          !["DRAFT", "REVIEW"].includes(v.status) ||
          v.featured !== (existing?.featured ?? false) ||
          v.demo !== (existing?.demo ?? true)
        )
          throw new HttpError(
            403,
            "Only a manager can publish or change featured/demo flags",
          );
      }
      if (v.status === "PUBLISHED" && existing?.status !== "PUBLISHED") {
        if (existing?.status !== "REVIEW")
          throw new HttpError(
            409,
            "Submit the draft for review before publication.",
            "REVIEW_REQUIRED",
          );
      }
      // Existing public records also remain subject to the same quality gate.
      if (v.status === "PUBLISHED") {
        const issues = publicationIssues(v);
        if (issues.length)
          throw new HttpError(422, issues.join(" "), "PUBLICATION_INCOMPLETE");
      }
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${v.agentId} FOR UPDATE`;
      const assigned = await tx.user.findFirst({
        where: { id: v.agentId, active: true },
        select: { branchId: true },
      });
      if (!assigned) throw new HttpError(400, "Active agent required");
      const branchId = assigned.branchId;
      if (!inScope(actor, { agentId: v.agentId, branchId }))
        throw new HttpError(403, "Assignment outside your scope");
      await requireActiveBranch(tx, branchId);
      const input = {
        ...v,
        branchId,
        translations: v.translations as Prisma.InputJsonValue,
        seo: (v.seo ?? {}) as Prisma.InputJsonValue,
      };
      if (existing) {
        const version = expectedVersion(body, ifMatch);
        const updated = await tx.property.updateMany({
          where: { id: existing.id, version },
          data: { ...input, version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new HttpError(
            409,
            "This record was changed by another user. Your changes were not applied.",
            "VERSION_CONFLICT",
          );
        result = await tx.property.findUniqueOrThrow({
          where: { id: existing.id },
        });
      } else result = await tx.property.create({ data: input });
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: method,
        resource: "properties",
        resourceId: result.id,
        metadata: {
          fromVersion: existing?.version ?? null,
          toVersion: method === "DELETE" ? null : result.version,
          fromStatus: existing?.status ?? null,
          toStatus: method === "DELETE" ? null : result.status,
          priceFrom: existing?.price ?? null,
          priceTo: method === "DELETE" ? null : result.price,
        },
      },
    });
    return result;
  });
}
