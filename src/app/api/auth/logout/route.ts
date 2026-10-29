import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sameOrigin, sessionCookie, hashToken } from "@/lib/security";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(sessionCookie);
  if (
    req.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return Response.redirect(
      new URL("/admin", process.env.SITE_URL ?? "http://localhost:3000"),
      303,
    );
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
