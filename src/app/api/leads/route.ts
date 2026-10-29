import { href } from "@/lib/i18n";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { publicStatuses } from "@/lib/catalog";
import {
  apiError,
  clientKey,
  HttpError,
  rateLimit,
  readJson,
  readBodyLimited,
  sameOrigin,
} from "@/lib/security";
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) throw new HttpError(403, "Invalid origin");
    if (!(await rateLimit(`leads:${clientKey(req)}`, 10, 3600000)))
      throw new HttpError(429, "Try again later");
    const contentType = req.headers.get("content-type")?.split(";")[0].trim();
    const native = contentType === "application/x-www-form-urlencoded";
    let input: unknown;
    if (native) {
      const form = new URLSearchParams(
        new TextDecoder().decode(await readBodyLimited(req, 20000)),
      );
      input = {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone") ?? undefined,
        message: form.get("message"),
        kind: form.get("kind"),
        locale: form.get("locale"),
        consent: form.get("consent") === "on",
        website: form.get("website") ?? undefined,
        propertyId: form.get("propertyId") || undefined,
      };
    } else if (contentType === "application/json") input = await readJson(req);
    else throw new HttpError(415, "Use JSON or a native form POST");
    const v = leadSchema.parse(input);
    const property = v.propertyId
      ? await db.property.findFirst({
          where: { id: v.propertyId, status: { in: [...publicStatuses] } },
        })
      : null;
    if (v.kind === "VIEWING" && property && property.status !== "PUBLISHED")
      throw new HttpError(409, "Property is not available for viewings");
    if (v.propertyId && !property)
      throw new HttpError(400, "Property unavailable");
    await db.lead.create({
      data: {
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        kind: v.kind,
        locale: v.locale,
        consentAt: new Date(),
        propertyId: property?.id,
        agentId: property?.agentId,
      },
    });
    if (native)
      return Response.redirect(
        new URL(
          `${href(v.locale, "contact")}?request=received`,
          process.env.SITE_URL ?? "http://localhost:3000",
        ),
        303,
      );
    return Response.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
