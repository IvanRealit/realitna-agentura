import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { filters, pageNumber, publicStatuses, type Query } from "@/lib/catalog";
import {
  dictionaries,
  href,
  translation,
  type Locale,
  type RouteKey,
} from "@/lib/i18n";
import { MapView } from "@/components/client";
import { PropertyCard } from "@/components/property-card";
import { Filters } from "@/components/filters";
import { PageHead } from "./page-head";
export async function Catalog({
  l,
  key,
  q,
  slug,
}: {
  l: Locale;
  key: RouteKey;
  q: Query;
  slug?: string;
}) {
  const d = dictionaries[l];
  const query = { ...q };
  if (key === "sale") query.transaction = "SALE";
  if (key === "rent") query.transaction = "RENT";
  if (key === "new") query.condition = "NEW";
  if (key === "commercial") query.type = "COMMERCIAL";
  let locationName = "";
  if (key === "locations" && slug) {
    const p = await db.property.findFirst({
      where: {
        status: { in: [...publicStatuses] },
        OR: [
          { city: { equals: slug.replaceAll("-", " "), mode: "insensitive" } },
          {
            region: { equals: slug.replaceAll("-", " "), mode: "insensitive" },
          },
        ],
      },
    });
    if (!p) notFound();
    if (p.city.toLowerCase().replaceAll(" ", "-") === slug) {
      query.city = p.city;
      locationName = p.city;
    } else {
      query.region = p.region;
      locationName = p.region;
    }
  }
  if (slug && key !== "locations") notFound();
  const where = filters(query);
  const page = pageNumber(query.page);
  const size = 9;
  const orderBy: Prisma.PropertyOrderByWithRelationInput =
    query.sort === "priceAsc"
      ? { price: "asc" }
      : query.sort === "priceDesc"
        ? { price: "desc" }
        : { createdAt: "desc" };
  const [total, properties, allCities, allRegions] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * size,
      take: size,
    }),
    db.property.findMany({
      where: { status: { in: [...publicStatuses] } },
      distinct: ["city"],
      select: { city: true },
    }),
    db.property.findMany({
      where: { status: { in: [...publicStatuses] } },
      distinct: ["region"],
      select: { region: true },
    }),
  ]);
  function url(patch: Query) {
    const s = new URLSearchParams();
    Object.entries({ ...query, ...patch }).forEach(([k, v]) => {
      if (v) s.set(k, v);
    });
    return `${href(l, "catalog")}?${s}`;
  }
  const points = properties
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      title: translation(p.translations, l).title,
      lat: p.latitude!,
      lng: p.longitude!,
      url: href(l, "catalog", p.slug),
      demo: p.demo,
    }));
  return (
    <>
      <PageHead
        l={l}
        title={locationName ? `${d.catalog} — ${locationName}` : d[key]}
        description={d.featuredIntro}
      />
      <section className="container section" style={{ paddingTop: 0 }}>
        <Filters
          l={l}
          q={query}
          cities={allCities.map((c) => c.city)}
          regions={allRegions.map((c) => c.region)}
        />
        <div className="results-toolbar">
          <p>
            {total} {d.results}
          </p>
          <div className="view-toggle">
            <Link
              className={query.view !== "map" ? "active" : ""}
              href={url({ view: "list" })}
            >
              {d.list}
            </Link>
            <Link
              className={query.view === "map" ? "active" : ""}
              href={url({ view: "map" })}
            >
              {d.map}
            </Link>
          </div>
        </div>
        {query.view === "map" ? (
          <MapView l={l} points={points} />
        ) : properties.length ? (
          <div className="property-grid">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} l={l} />
            ))}
          </div>
        ) : (
          <p className="empty">{d.empty}</p>
        )}
        <nav className="pagination" aria-label="Pagination">
          {page > 1 && (
            <Link
              className="button outline"
              href={url({ page: String(page - 1) })}
            >
              {d.previous}
            </Link>
          )}
          <span>
            {page} / {Math.max(1, Math.ceil(total / size))}
          </span>
          {page * size < total && (
            <Link
              className="button outline"
              href={url({ page: String(page + 1) })}
            >
              {d.next}
            </Link>
          )}
        </nav>
        <p className="demo-notice">{d.notice}</p>
        {key === "locations" && !slug && (
          <div className="location-links">
            {[
              ...allCities.map((c) => c.city),
              ...allRegions.map((c) => c.region),
            ].map((city) => (
              <Link
                key={city}
                href={href(
                  l,
                  "locations",
                  city.toLowerCase().replaceAll(" ", "-"),
                )}
              >
                {city} ↗
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
