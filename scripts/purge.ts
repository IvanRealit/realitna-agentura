import "dotenv/config";
import { db } from "../src/lib/db";
try {
  const settings = await db.settings.findUnique({ where: { id: "site" } });
  const days = settings?.retentionDays ?? 180;
  const cutoff = new Date(Date.now() - days * 86400000);
  const result = await db.$transaction(async (tx) => {
    const leads = await tx.lead.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    await tx.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await tx.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await tx.auditLog.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 365 * 86400000) } },
    });
    await tx.auditLog.create({
      data: {
        actorId: "system",
        action: "RETENTION_PURGE",
        resource: "leads",
        resourceId: `count:${leads.count}`,
      },
    });
    return leads;
  });
  console.log(
    `Purged ${result.count} leads older than ${days} days; expired sessions/rate limits cleaned.`,
  );
} finally {
  await db.$disconnect();
}
