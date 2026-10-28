import { Avatar } from "@/components/avatar";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  dictionaries,
  href,
  translation,
  type Locale,
  type RouteKey,
} from "@/lib/i18n";
import { aboutCopy, legalCopy } from "@/lib/copy";
import { siteSettings, jsonLd } from "@/lib/site";
import { LeadForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { PageHead } from "./page-head";
import { Services } from "./services";
export async function ContentPage({
  l,
  key,
  slug,
}: {
  l: Locale;
  key: RouteKey;
  slug?: string;
}) {
  const d = dictionaries[l];
  const settings = await siteSettings();
  if (slug && key !== "blog") notFound();
  if (key === "blog") {
    if (slug) {
      const p = await db.content.findFirst({
        where: { slug, kind: "BLOG", published: true },
      });
      if (!p) notFound();
      const t = translation(p.translations, l);
      return (
        <>
          <PageHead l={l} title={t.title} />
          <article
            className="container section legal"
            style={{ paddingTop: 0 }}
          >
            <p className="prose">{t.description}</p>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: jsonLd({
                  "@context": "https://schema.org",
                  "@type": "BlogPosting",
                  headline: t.title,
                  datePublished: p.createdAt.toISOString(),
                  dateModified: p.updatedAt.toISOString(),
                  inLanguage: l,
                  author: { "@type": "Organization", name: settings.brand },
                }),
              }}
            />
          </article>
        </>
      );
    }
    const posts = await db.content.findMany({
      where: { kind: "BLOG", published: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <>
        <PageHead l={l} title={d.blog} />
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="team-grid">
            {posts.map((p) => {
              const t = translation(p.translations, l);
              return (
                <article className="content-card" key={p.id}>
                  <div className="eyebrow">
                    {new Intl.DateTimeFormat(l).format(p.createdAt)}
                  </div>
                  <h2>
                    <Link href={href(l, "blog", p.slug)}>{t.title}</Link>
                  </h2>
                  <p>{t.description.slice(0, 180)}…</p>
                  <Link href={href(l, "blog", p.slug)} className="text-link">
                    {d.detail}
                    <Icon name="arrow" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </>
    );
  }
  const override = await db.content.findFirst({
    where: { slug: key, kind: "PAGE", published: true },
  });
  const t = override ? translation(override.translations, l) : null;
  if (["privacy", "cookies", "terms"].includes(key))
    return (
      <>
        <PageHead l={l} title={t?.title || d[key]} />
        <article className="container section legal" style={{ paddingTop: 0 }}>
          <div className="draft-warning">{d.legalDraft}</div>
          <p className="prose">{t?.description || legalCopy[l][key]}</p>
        </article>
      </>
    );
  if (key === "team") {
    const agents = await db.user.findMany({
      where: { active: true, role: "AGENT" },
      select: {
        id: true,
        name: true,
        bio: true,
        avatar: true,
        email: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });
    return (
      <>
        <PageHead l={l} title={t?.title || d.team} description={d.trustBody} />
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="team-grid">
            {agents.map((a) => (
              <article className="team-card" key={a.id}>
                <Avatar name={a.name} src={a.avatar} />
                <h2>{a.name}</h2>
                <p>
                  {translation(a.bio, l).description ||
                    (a.email.endsWith(".invalid") ? d.noContacts : d.trustBody)}
                </p>
                {a.email.endsWith(".invalid") ? (
                  <p className="demo-notice">{d.noContacts}</p>
                ) : (
                  <div className="footer-links">
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                    {a.phone && (
                      <a href={`tel:${a.phone.replace(/[^+\d]/g, "")}`}>
                        {a.phone}
                      </a>
                    )}
                  </div>
                )}
                <Link className="text-link" href={href(l, "contact")}>
                  {d.contact} ↗
                </Link>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }
  if (key === "contact" || key === "valuation")
    return (
      <>
        <PageHead
          l={l}
          title={t?.title || d[key]}
          description={t?.description || d.ctaBody}
        />
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="content-grid">
            <div>
              <h2>{d.cta}</h2>
              <p style={{ margin: "25px 0" }}>{d.trustBody}</p>
              <div className="footer-links">
                <span>{settings.address}</span>
                {!settings.email.endsWith(".invalid") && (
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                )}
                {settings.phone && (
                  <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
                    {settings.phone}
                  </a>
                )}
              </div>
              <p className="demo-notice">{d.notice}</p>
            </div>
            <div className="content-card">
              <LeadForm
                l={l}
                kind={key === "valuation" ? "VALUATION" : "CONSULTATION"}
              />
            </div>
          </div>
        </section>
      </>
    );
  if (key === "services")
    return (
      <>
        <PageHead
          l={l}
          title={t?.title || d.services}
          description={t?.description || d.trustBody}
        />
        <section className="container section">
          <Services l={l} />
        </section>
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="content-card">
            <LeadForm l={l} />
          </div>
        </section>
      </>
    );
  return (
    <>
      <PageHead l={l} title={t?.title || d.about} />
      <section className="container section" style={{ paddingTop: 0 }}>
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
            <h2>{d.trustTitle}</h2>
            <div className="prose" style={{ margin: "25px 0" }}>
              {t?.description || aboutCopy[l]}
            </div>
            <div className="button-row">
              <Link href={href(l, "team")} className="button">
                {d.team}
                <Icon name="arrow" />
              </Link>
              <Link href={href(l, "contact")} className="button outline">
                {d.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
