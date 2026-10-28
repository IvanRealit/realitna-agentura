import { Avatar } from "@/components/avatar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicStatuses } from "@/lib/catalog";
import {
  dictionaries,
  href,
  label,
  money,
  translation,
  type Locale,
} from "@/lib/i18n";
import { siteUrl, jsonLd } from "@/lib/site";
import { Gallery, LeadForm, MapView } from "@/components/client";
import { PropertyCard } from "@/components/property-card";
import { Icon } from "@/components/icons";
import { visibleProperty } from "@/lib/properties";
export async function Detail({ l, slug }: { l: Locale; slug: string }) {
  const p = await visibleProperty(slug);
  if (!p) notFound();
  const d = dictionaries[l];
  const t = translation(p.translations, l);
  const similar = await db.property.findMany({
    where: {
      status: { in: [...publicStatuses] },
      id: { not: p.id },
      transaction: p.transaction,
    },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: t.title,
    description: t.description,
    datePosted: p.createdAt.toISOString(),
    url: new URL(href(l, "catalog", p.slug), siteUrl()).href,
    image: p.images.map((v) => new URL(v, siteUrl()).href),
    ...(p.demo
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "EUR",
            availability:
              p.status === "PUBLISHED"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }),
  };
  return (
    <>
      <section className="container page-head">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href={href(l)}>{d.home}</Link>
          <span>/</span>
          <Link href={href(l, "catalog")}>{d.catalog}</Link>
          <span>/</span>
          <span>{p.city}</span>
        </nav>
        <div className="detail-head">
          <div>
            <div className="eyebrow">
              {label(p.transaction, l)} · {label(p.status, l)}
              {p.demo ? " · DEMO" : ""}
            </div>
            <h1>{t.title}</h1>
            <p className="detail-location">
              <Icon name="pin" />
              {p.demo ? `${p.city} · ${d.demo}` : p.address}
            </p>
          </div>
          <div className="detail-price">
            {money(p.price, l)}
            {p.transaction === "RENT" && (
              <small>
                {" "}
                / {l === "sk" ? "mes." : l === "uk" ? "міс." : "mo."}
              </small>
            )}
          </div>
        </div>
      </section>
      <section className="container">
        <div className="detail-layout">
          <div>
            <Gallery images={p.images} title={t.title} />
            <article className="detail-copy">
              <h2>{d.overview}</h2>
              <div className="prose">{t.description}</div>
              <h2>{d.features}</h2>
              <dl className="spec-table">
                {[
                  [d.area, `${p.area} m²`],
                  [d.rooms, p.rooms],
                  [d.type, label(p.type, l)],
                  [d.condition, label(p.condition, l)],
                  [d.city, p.city],
                  [d.region, p.region],
                  [d.address, p.demo ? "DEMO — " + p.city : p.address],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {[p.videoUrl, p.tourUrl, p.floorPlan, p.brochure].some(
                Boolean,
              ) && (
                <>
                  <h2>{d.media}</h2>
                  <div className="button-row">
                    {[
                      [p.videoUrl, d.video],
                      [p.tourUrl, d.tour],
                      [p.floorPlan, d.plan],
                      [p.brochure, d.brochure],
                    ].map(
                      ([url, title]) =>
                        url && (
                          <a
                            key={title}
                            className="button outline"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {title} ↗
                          </a>
                        ),
                    )}
                  </div>
                </>
              )}
              {p.latitude !== null && p.longitude !== null && (
                <>
                  <h2>{d.map}</h2>
                  <MapView
                    l={l}
                    points={[
                      {
                        title: t.title,
                        lat: p.latitude,
                        lng: p.longitude,
                        url: href(l, "catalog", p.slug),
                        demo: p.demo,
                      },
                    ]}
                  />
                </>
              )}
            </article>
          </div>
          <aside className="agent-panel">
            <div className="eyebrow">{d.agent}</div>
            <Avatar name={p.agent.name} src={p.agent.avatar} />
            <h2>{p.agent.name}</h2>
            {p.demo ? (
              <p>{d.noContacts}</p>
            ) : (
              <div className="footer-links">
                <a href={`mailto:${p.agent.email}`}>{p.agent.email}</a>
                {p.agent.phone && (
                  <a href={`tel:${p.agent.phone.replace(/[^+\d]/g, "")}`}>
                    {p.agent.phone}
                  </a>
                )}
              </div>
            )}
            <h3 style={{ marginTop: 25 }}>
              {p.status === "PUBLISHED" ? d.request : d.consultation}
            </h3>
            <LeadForm
              l={l}
              propertyId={p.id}
              kind={p.status === "PUBLISHED" ? "VIEWING" : "CONSULTATION"}
            />
          </aside>
        </div>
      </section>
      <section className="container section">
        <div className="section-head">
          <h2>{d.similar}</h2>
        </div>
        <div className="property-grid">
          {similar.map((v) => (
            <PropertyCard key={v.id} l={l} property={v} />
          ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
      />
    </>
  );
}
