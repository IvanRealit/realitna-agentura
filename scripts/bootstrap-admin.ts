import "dotenv/config";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { db } from "../src/lib/db";
import { passwordSchema } from "../src/modules/identity/validation";
try {
  const email = z.email().parse(process.env.SEED_ADMIN_EMAIL).toLowerCase();
  const password = passwordSchema.parse(process.env.SEED_ADMIN_PASSWORD);
  const passwordHash = await hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73261029)`;
    if (process.argv.includes("--promote-existing")) {
      if (await tx.user.count({ where: { role: "SUPER_ADMIN" } }))
        throw new Error(
          "An owner already exists; use authenticated administration.",
        );
      const existing = await tx.user.findUnique({ where: { email } });
      if (
        !existing?.active ||
        existing.role !== "ADMIN" ||
        !(await compare(password, existing.passwordHash))
      )
        throw new Error(
          "An active existing ADMIN and its current password are required for explicit owner promotion.",
        );
      await tx.user.update({
        where: { id: existing.id },
        data: { role: "SUPER_ADMIN", authVersion: { increment: 1 } },
      });
      await tx.session.deleteMany({ where: { userId: existing.id } });
      await tx.accountToken.deleteMany({ where: { userId: existing.id } });
      await tx.auditLog.create({
        data: {
          actorId: existing.id,
          action: "PROMOTE_INITIAL_OWNER",
          resource: "users",
          resourceId: existing.id,
        },
      });
      return;
    }
    if (
      await tx.user.count({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } } })
    )
      throw new Error(
        "An administrator already exists. Use authenticated administration or explicit --promote-existing with the current ADMIN credentials. No account was changed.",
      );
    const user = await tx.user.create({
      data: { email, name: "Agency owner", role: "SUPER_ADMIN", passwordHash },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "BOOTSTRAP_OWNER",
        resource: "users",
        resourceId: user.id,
      },
    });
  });
  console.log(
    "Owner bootstrap completed without DEMO content. Remove bootstrap variables and enroll MFA.",
  );
} catch (e) {
  console.error(
    e instanceof Error && e.name === "Error"
      ? e.message
      : "Valid bootstrap email and a 12-character password within 72 UTF-8 bytes are required; values are not logged.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
