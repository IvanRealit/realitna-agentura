import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import {
  apiError,
  currentUser,
  HttpError,
  rateLimit,
  readBodyLimited,
  sameOrigin,
} from "@/lib/security";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Sign in required");
    if (!sameOrigin(req)) throw new HttpError(403, "Invalid origin");
    if (!(await rateLimit(`upload:${user.id}`, 30, 3600000)))
      throw new HttpError(429, "Try again later");
    if (Number(req.headers.get("content-length") ?? 0) > 10 * 1024 * 1024)
      throw new HttpError(413, "Maximum 8 MB");
    const raw = await readBodyLimited(req, 10 * 1024 * 1024);
    const form = await new Response(raw, {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 8 * 1024 * 1024 ||
      file.size < 12
    )
      throw new HttpError(400, "Invalid file, maximum 8 MB");
    const b = Buffer.from(await file.arrayBuffer());
    let ext = "";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ext = "jpg";
    if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      ext = "png";
    if (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    )
      ext = "webp";
    if (!ext)
      throw new HttpError(400, "Only JPEG, PNG and WebP images are accepted");
    // Decode/re-encode to remove metadata and reject malformed or oversized images.
    const sharp = (await import("sharp")).default;
    const output = await sharp(b, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    const root = path.resolve(
      /* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "data/uploads",
    );
    const name = `${randomUUID()}.webp`;
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, name), output, { flag: "wx" });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPLOAD",
        resource: "media",
        resourceId: name,
      },
    });
    return Response.json({ url: `/uploads/${name}` }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
