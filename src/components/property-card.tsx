import Image from "next/image";
import Link from "next/link";
import type { Property } from "@prisma/client";
import {
  dictionaries,
  href,
  label,
  money,
  translation,
  type Locale,
} from "@/lib/i18n";
import { Favorite } from "./client";
import { Icon } from "./icons";
export function PropertyCard({
  property: p,
  l,
}: {
  property: Property;
  l: Locale;
}) {
  const t = translation(p.translations, l);
  const d = dictionaries[l];
  return (
    <article className="property-card">
      <div className="card-image">
        <Link href={href(l, "catalog", p.slug)}>
          <Image
            src={p.images[0] ?? "/images/placeholder.svg"}
            alt={t.title}
            fill
            sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"
          />
        </Link>
        <div className="card-tags">
          <span>{label(p.transaction, l)}</span>
          {p.demo && <span className="demo-tag">DEMO</span>}
          {p.status !== "PUBLISHED" && <span>{label(p.status, l)}</span>}
        </div>
        <Favorite id={p.id} l={l} />
      </div>
      <div className="card-body">
        <div className="card-location">
          <Icon name="pin" />
          {p.city} · {p.region}
        </div>
        <h3>
          <Link href={href(l, "catalog", p.slug)}>{t.title}</Link>
        </h3>
        <div className="card-specs">
          <span>
            <Icon name="area" />
            {p.area} m²
          </span>
          <span>
            <Icon name="bed" />
            {p.rooms} {d.rooms.toLowerCase()}
          </span>
          <span>{label(p.type, l)}</span>
        </div>
        <div className="card-bottom">
          <strong>
            {money(p.price, l)}
            {p.transaction === "RENT" && (
              <small>
                {" "}
                / {l === "sk" ? "mes." : l === "uk" ? "міс." : "mo."}
              </small>
            )}
          </strong>
          <Link
            className="circle-link"
            aria-label={d.detail}
            href={href(l, "catalog", p.slug)}
          >
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
