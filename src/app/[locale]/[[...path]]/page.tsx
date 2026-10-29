import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publicStatuses, type Query } from "@/lib/catalog";
import {
  dictionaries,
  href,
  isLocale,
  locales,
  routeKey,
  translation,
} from "@/lib/i18n";
import { siteSettings, siteUrl, jsonLd } from "@/lib/site";
import { Consent, FavoriteGrid, Header } from "@/components/client";
import { PropertyCard } from "@/components/property-card";
import { visibleProperty } from "@/lib/properties";
import { PageHead } from "@/components/pages/page-head";
import { Home } from "@/components/pages/home";
import { Catalog } from "@/components/pages/catalog";
import { Detail } from "@/components/pages/detail";
import { ContentPage } from "@/components/pages/content-page";
import { Footer } from "@/components/pages/footer";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ locale: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function resolve(props: Props) {
  const { locale, path = [] } = await props.params;
  if (!isLocale(locale)) notFound();
  const key = routeKey(locale, path[0]);
  if (path[0] && !key) notFound();
  if (path.length > 2) notFound();
  return { l: locale, key, slug: path[1], path };
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { l, key, slug } = await resolve(props);
  const d = dictionaries[l];
  const settings = await siteSettings();
  let title = key ? d[key] : `${settings.brand} — ${d.eyebrow.toLowerCase()}`;
  let description = d.intro;
  let image = "/images/living.webp";
  let demo = false;
  if (key === "catalog" && slug) {
    const p = await visibleProperty(slug);
    if (!p) notFound();
    const t = translation(p.translations, l);
    const seo = translation(p.seo, l);
    title = seo.title || t.title;
    description = seo.description || t.description.slice(0, 160);
    image = p.images[0] ?? image;
    demo = p.demo;
  }
  if (key === "blog" && slug) {
    const c = await db.content.findFirst({
      where: { slug, kind: "BLOG", published: true },
    });
    if (!c) notFound();
    const t = translation(c.translations, l);
    const s = translation(c.seo, l);
    title = s.title || t.title;
    description = s.description || t.description.slice(0, 160);
  }
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
    title = `${d.catalog} — ${p.city.toLowerCase().replaceAll(" ", "-") === slug ? p.city : p.region}`;
  }
  if (key && !["catalog", "blog", "locations"].includes(key) && slug)
    notFound();
  if (key) {
    const c = await db.content.findFirst({
      where: { slug: key, kind: "PAGE", published: true },
    });
    if (c) {
      const seo = translation(c.seo, l);
      if (seo.title) title = seo.title;
      if (seo.description) description = seo.description;
    }
  }
  const q = await props.searchParams;
  const hasFilters = Object.keys(q).length > 0;
  return {
    title: { absolute: `${title} | ${settings.brand}` },
    description,
    alternates: {
      canonical: href(l, key, slug),
      languages: {
        ...Object.fromEntries(
          locales.map((lang) => [lang, href(lang, key, slug)]),
        ),
        "x-default": href("sk", key, slug),
      },
    },
    openGraph: {
      title,
      description,
      url: href(l, key, slug),
      type: "website",
      locale: l === "sk" ? "sk_SK" : l === "uk" ? "uk_UA" : "en_GB",
      images: [{ url: image, width: 1600, height: 1000, alt: title }],
    },
    robots: demo || hasFilters ? { index: false, follow: true } : undefined,
  };
}
export default async function Page(props: Props) {
  const { l, key, slug } = await resolve(props);
  const d = dictionaries[l];
  const settings = await siteSettings();
  const raw = await props.searchParams;
  const q: Query = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  let content: React.ReactNode;
  if (!key) content = await Home({ l });
  else if (key === "catalog" && slug) content = await Detail({ l, slug });
  else if (
    ["catalog", "sale", "rent", "new", "commercial", "locations"].includes(key)
  )
    content = await Catalog({ l, key, q, slug });
  else if (key === "favorites") {
    const p = await db.property.findMany({
      where: { status: { in: [...publicStatuses] } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    content = (
      <>
        <PageHead l={l} title={d.favorites} />
        <section className="container section" style={{ paddingTop: 0 }}>
          <FavoriteGrid l={l} ids={p.map((v) => v.id)}>
            {p.map((v) => (
              <PropertyCard key={v.id} property={v} l={l} />
            ))}
          </FavoriteGrid>
        </section>
      </>
    );
  } else
    content = await ContentPage({
      l,
      key,
      slug,
      formSent: q.request === "received",
    });
  return (
    <>
      <a href="#main" className="skip-link">
        {l === "sk"
          ? "Preskočiť na obsah"
          : l === "uk"
            ? "Перейти до вмісту"
            : "Skip to content"}
      </a>
      <Header l={l} brand={settings.brand} current={key} slug={slug} />
      <main id="main">{content}</main>
      <Footer l={l} />
      <Consent l={l} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: settings.brand,
            url: siteUrl().href,
            inLanguage: locales,
          }),
        }}
      />
    </>
  );
}
