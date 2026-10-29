import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { can, type Actor } from "@/modules/access/policy";
import { expectedVersion } from "@/modules/properties/rules";
export const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(300).default(""),
  city: z.string().trim().min(2).max(100),
  phone: z.string().max(40).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  active: z.boolean().default(true),
  publicContact: z.boolean().default(false),
  commissionBps: z.number().int().min(0).max(10000).default(0),
});
export async function requireActiveBranch(
  tx: Prisma.TransactionClient,
  branchId: string | null | undefined,
) {
  if (!branchId) return;
  const rows = await tx.$queryRaw<
    { active: boolean }[]
  >`SELECT active FROM "Branch" WHERE id=${branchId} FOR UPDATE`;
  if (!rows[0]?.active) throw new HttpError(400, "Active branch required");
}
export async function writeBranch(
  actor: Actor,
  id: string | undefined,
  body: unknown,
) {
  if (!can(actor.role, "branches", id ? "update" : "create"))
    throw new HttpError(403, "Branch administration required");
  const value = branchSchema.parse(body);
  return db.$transaction(async (tx) => {
    if (id) {
      await tx.$queryRaw`SELECT id FROM "Branch" WHERE id=${id} FOR UPDATE`;
      const current = await tx.branch.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Branch not found");
      if (current.version !== expectedVersion(body, null))
        throw new HttpError(
          409,
          "Branch changed; reload before saving",
          "VERSION_CONFLICT",
        );
      if (!value.active) {
        const [users, properties, leads] = await Promise.all([
          tx.user.count({ where: { branchId: id, active: true } }),
          tx.property.count({
            where: {
              branchId: id,
              status: { notIn: ["SOLD", "RENTED", "ARCHIVED"] },
            },
          }),
          tx.lead.count({ where: { branchId: id, status: { not: "CLOSED" } } }),
        ]);
        if (users || properties || leads)
          throw new HttpError(
            409,
            "Reassign active staff, listings and leads before archiving the branch",
          );
      }
    }
    const result = id
      ? await tx.branch.update({
          where: { id },
          data: { ...value, version: { increment: 1 } },
        })
      : await tx.branch.create({ data: value });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: id ? "UPDATE" : "CREATE",
        resource: "branches",
        resourceId: result.id,
        metadata: { active: result.active, version: result.version },
      },
    });
    return result;
  });
}
