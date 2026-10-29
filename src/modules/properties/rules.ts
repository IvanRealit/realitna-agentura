import { HttpError } from "@/lib/security";
export function expectedVersion(body: unknown, ifMatch: string | null) {
  const value =
    body && typeof body === "object" && "version" in body
      ? body.version
      : undefined;
  let header: number | undefined;
  if (ifMatch !== null) {
    if (!/^"[1-9][0-9]{0,9}"$/.test(ifMatch))
      throw new HttpError(400, "If-Match must contain one quoted version");
    header = Number(ifMatch.slice(1, -1));
  }
  const candidate = value ?? header;
  if (candidate === undefined)
    throw new HttpError(
      428,
      "Refresh the record and include its version before editing or deleting.",
      "VERSION_REQUIRED",
    );
  if (
    typeof candidate !== "number" ||
    !Number.isInteger(candidate) ||
    candidate < 1 ||
    candidate > 2147483646 ||
    (header !== undefined && value !== undefined && header !== value)
  )
    throw new HttpError(400, "Invalid or conflicting version precondition");
  return candidate;
}
export function publicationIssues(property: {
  price: number;
  images: string[];
  translations: { sk: { description: string } };
}) {
  const issues: string[] = [];
  if (property.price <= 0) issues.push("Enter a positive public price.");
  if (property.images.length === 0)
    issues.push("Add at least one approved image.");
  if (property.translations.sk.description.length < 40)
    issues.push("The Slovak description must contain at least 40 characters.");
  return issues;
}
