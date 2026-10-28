import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiError,
  clientKey,
  cookieOptions,
  hashToken,
  HttpError,
  newSession,
  rateLimit,
  readJson,
  sameOrigin,
  sessionCookie,
} from "@/lib/security";
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) throw new HttpError(403, "Invalid origin");
    if (!(await rateLimit(`login:${clientKey(req)}`, 10, 15 * 60000)))
      throw new HttpError(429, "Try again later");
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(1).max(128) })
      .parse(await readJson(req));
    if (
      !(await rateLimit(
        `account:${hashToken(email.toLowerCase())}`,
        10,
        15 * 60000,
      ))
    )
      throw new HttpError(429, "Try again later");
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    const valid = await compare(
      password,
      user?.passwordHash ??
        "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
    );
    if (!user || !user.active || !valid)
      throw new HttpError(401, "Invalid credentials");
    const token = await newSession(user.id);
    (await cookies()).set(sessionCookie, token, cookieOptions());
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
