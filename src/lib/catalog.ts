import type { Prisma } from "@prisma/client";
export const publicStatuses = [
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "RENTED",
] as const;
export type Query = Record<string, string | undefined>;
export function filters(q: Query): Prisma.PropertyWhereInput {
  const w: Prisma.PropertyWhereInput = { status: { in: [...publicStatuses] } };
  if (q.city) w.city = { equals: q.city, mode: "insensitive" };
  if (q.region) w.region = { equals: q.region, mode: "insensitive" };
  if (["APARTMENT", "HOUSE", "LAND", "COMMERCIAL"].includes(q.type ?? ""))
    w.type = q.type;
  if (["SALE", "RENT"].includes(q.transaction ?? ""))
    w.transaction = q.transaction;
  if (["NEW", "RENOVATED", "ORIGINAL"].includes(q.condition ?? ""))
    w.condition = q.condition;
  const n = (v: string | undefined) =>
    v && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 2000000000
      ? Number(v)
      : undefined;
  const integer = (v: string | undefined) =>
    n(v) !== undefined && Number.isInteger(n(v)) ? n(v) : undefined;
  if (integer(q.minPrice) !== undefined || integer(q.maxPrice) !== undefined)
    w.price = { gte: integer(q.minPrice), lte: integer(q.maxPrice) };
  if (n(q.minArea) !== undefined || n(q.maxArea) !== undefined)
    w.area = { gte: n(q.minArea), lte: n(q.maxArea) };
  if (integer(q.rooms) !== undefined) w.rooms = integer(q.rooms);
  return w;
}
export function pageNumber(v?: string) {
  return Math.min(10000, Math.max(1, Math.floor(Number(v) || 1)));
}
