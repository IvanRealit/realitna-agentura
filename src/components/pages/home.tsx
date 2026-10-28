import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { publicStatuses } from "@/lib/catalog";
import { dictionaries, href, label, type Locale } from "@/lib/i18n";
import { PropertyCard } from "@/components/property-card";
import { Icon } from "@/components/icons";
import { Services } from "./services";
export async function Home({ l }: { l: Locale }) {
  const d = dictionaries[l];
  const properties = await db.property.findMany({
    where: { status: { in: [...publicStatuses] }, featured: true },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });
  const cities = await db.property.findMany({
    where: { status: { in: [...publicStatuses] } },
    distinct: ["city"],
    select: { city: true },
  });
  return (
    <>
      <section className="hero">
        <div className="hero-image">
          <Image
            src="/images/living.webp"
            alt={
              l === "uk"
                ? "Ілюстративний сучасний інтер’єр"
                : l === "en"
                  ? "Illustrative contemporary interior"
                  : "Ilustračný moderný interiér"
            }
            fill
            priority
            sizes="(max-width:800px) 100vw, 70vw"
          />
        </div>
        <div className="container hero-content">
          <div className="eyebrow">{d.eyebrow}</div>
          <h1>{d.hero}</h1>
          <p>{d.intro}</p>
          <Link className="button" href={href(l, "catalog")}>
            {d.explore}
            <Icon name="arrow" />
          </Link>
        </div>
        <span className="hero-note">
          DEMO ·{" "}
          {l === "sk"
            ? "ILUSTRAČNÝ INTERIÉR"
            : l === "uk"
              ? "ІЛЮСТРАТИВНИЙ ІНТЕР’ЄР"
              : "ILLUSTRATIVE INTERIOR"}
        </span>
      </section>
      <div className="container">
        <form className="hero-search" action={href(l, "catalog")}>
          <label>
            {d.sale} / {d.rent}
            <select name="transaction">
              <option value="SALE">{d.sale}</option>
              <option value="RENT">{d.rent}</option>
            </select>
          </label>
          <label>
            {d.city}
            <select name="city">
              <option value="">
                {l === "sk"
                  ? "Celé Slovensko"
                  : l === "uk"
                    ? "Уся Словаччина"
                    : "All Slovakia"}
              </option>
              {cities.map((c) => (
                <option key={c.city}>{c.city}</option>
              ))}
            </select>
          </label>
          <label>
            {d.type}
            <select name="type">
              <option value="">—</option>
              {["APARTMENT", "HOUSE", "LAND", "COMMERCIAL"].map((t) => (
                <option key={t} value={t}>
                  {label(t, l)}
                </option>
              ))}
            </select>
          </label>
          <button className="button">
            <Icon name="search" />
            {d.search}
          </button>
        </form>
      </div>
      <section className="container section">
        <div className="section-head">
          <div>
            <div className="eyebrow">01 / {d.catalog}</div>
            <h2>{d.featured}</h2>
            <p>{d.featuredIntro}</p>
          </div>
          <Link className="text-link" href={href(l, "catalog")}>
            {d.all}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="property-grid">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} l={l} />
          ))}
        </div>
        <p className="demo-notice">{d.notice}</p>
      </section>
      <section className="container section" style={{ paddingTop: 10 }}>
        <div className="story">
          <div className="story-image">
            <Image
              src="/images/living.webp"
              alt={d.about}
              fill
              sizes="(max-width:800px) 100vw, 45vw"
            />
          </div>
          <div className="story-copy">
            <div className="eyebrow">02 / {d.about}</div>
            <h2>{d.trustTitle}</h2>
            <p>{d.trustBody}</p>
            <Link href={href(l, "about")} className="text-link">
              {d.about}
              <Icon name="arrow" />
            </Link>
            <div className="story-proof">
              <div>
                <strong>01</strong>
                <span>{d.service1}</span>
              </div>
              <div>
                <strong>02</strong>
                <span>{d.service2}</span>
              </div>
              <div>
                <strong>03</strong>
                <span>{d.service3}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="services-section">
        <div className="container section">
          <div className="section-head">
            <div>
              <div className="eyebrow">03 / {d.services}</div>
              <h2>{d.services}</h2>
            </div>
            <Link className="text-link" href={href(l, "services")}>
              {d.all}
              <Icon name="arrow" />
            </Link>
          </div>
          <Services l={l} />
        </div>
      </section>
      <section className="container section">
        <div className="cta">
          <div>
            <div className="eyebrow">{d.contact}</div>
            <h2>{d.cta}</h2>
            <p>{d.ctaBody}</p>
          </div>
          <Link href={href(l, "contact")} className="button light">
            {d.contact}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="location-links">
          {cities.map((c) => (
            <Link
              key={c.city}
              href={href(
                l,
                "locations",
                c.city.toLowerCase().replaceAll(" ", "-"),
              )}
            >
              {d.catalog} · {c.city} ↗
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
