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
  return Response.json({ ok: true });
}
