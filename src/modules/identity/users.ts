import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { userSchema } from "@/lib/validation";
import { can, type Actor } from "@/modules/access/policy";
import { requireActiveBranch } from "@/modules/branches/service";
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  phone: true,
  avatar: true,
  bio: true,
  branchId: true,
} as const;
export async function saveUser(
  actor: Actor,
  id: string | undefined,
  body: unknown,
) {
  if (!can(actor.role, "users", id ? "update" : "create"))
    throw new HttpError(403, "User administration required");
  const v = userSchema.parse(body);
  const passwordHash = v.password ? await hash(v.password, 12) : undefined;
  return db.$transaction(async (tx) => {
    if (id) await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR UPDATE`;
    const old = id ? await tx.user.findUnique({ where: { id } }) : null;
    if (id && !old) throw new HttpError(404, "User not found");
    if (
      actor.role !== "SUPER_ADMIN" &&
      (v.role === "SUPER_ADMIN" || old?.role === "SUPER_ADMIN")
    )
      throw new HttpError(403, "Only the owner can manage a Super Admin");
    if (id === actor.id && (!v.active || v.role !== actor.role))
      throw new HttpError(400, "Cannot revoke your own administrative access");
    if (!id && !passwordHash) throw new HttpError(400, "Password required");
    const branchId =
      v.branchId === undefined ? (old?.branchId ?? null) : v.branchId;
    if (["BRANCH_MANAGER", "COORDINATOR"].includes(v.role) && !branchId)
      throw new HttpError(400, "This role requires a branch");
    await requireActiveBranch(tx, branchId);
    if (old && old.branchId !== branchId) {
      const [properties, leads] = await Promise.all([
        tx.property.count({
          where: {
            agentId: id,
            status: { notIn: ["SOLD", "RENTED", "ARCHIVED"] },
          },
        }),
        tx.lead.count({ where: { agentId: id, status: { not: "CLOSED" } } }),
      ]);
      if (properties || leads)
        throw new HttpError(
          409,
          "Reassign active properties and leads before transferring this employee",
        );
    }
    const { password: _password, ...rest } = v;
    void _password;
    const input = {
      ...rest,
      branchId,
      email: v.email.toLowerCase(),
      bio: (v.bio ?? {}) as Prisma.InputJsonValue,
      ...(passwordHash ? { passwordHash } : {}),
    };
    const result = id
      ? await tx.user.update({
          where: { id },
          data: { ...input, authVersion: { increment: 1 } },
          select: userSelect,
        })
      : await tx.user.create({
          data: { ...input, passwordHash: passwordHash! },
          select: userSelect,
        });
    if (id) {
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.accountToken.deleteMany({ where: { userId: id } });
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: id ? "UPDATE" : "CREATE",
        resource: "users",
        resourceId: result.id,
        metadata: {
          role: result.role,
          branchId: result.branchId,
          active: result.active,
        },
      },
    });
    return result;
  });
}
