import type { Prisma } from "@prisma/client";
import { hashToken, HttpError } from "@/lib/security";
import { openSecret, verifyTotp } from "./totp";
export async function consumeFactor(
  userId: string,
  code: string,
  tx: Prisma.TransactionClient,
) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaLastCounter: true, recoveryHashes: true },
  });
  if (!user?.mfaSecret) return;
  const digest = hashToken(code);
  if (user.recoveryHashes.includes(digest)) {
    const result = await tx.user.updateMany({
      where: { id: userId, recoveryHashes: { has: digest } },
      data: {
        recoveryHashes: {
          set: user.recoveryHashes.filter((v) => v !== digest),
        },
      },
    });
    if (result.count === 1) return;
  } else {
    const counter = verifyTotp(openSecret(user.mfaSecret), code);
    if (counter !== null) {
      const result = await tx.user.updateMany({
        where: {
          id: userId,
          mfaLastCounter: { lt: BigInt(counter) },
          mfaSecret: user.mfaSecret,
        },
        data: { mfaLastCounter: BigInt(counter) },
      });
      if (result.count === 1) return;
    }
  }
  throw new HttpError(
    401,
    "Valid unused MFA or recovery code required",
    "MFA_REQUIRED",
  );
}
