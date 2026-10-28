import Link from "next/link";
import { dictionaries, href, type Locale, type RouteKey } from "@/lib/i18n";
import { siteSettings } from "@/lib/site";
export async function Footer({ l }: { l: Locale }) {
  const d = dictionaries[l];
  const s = await siteSettings();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href={href(l)} className="brand">
              {s.brand}
              <span className="brand-dot">.</span>
            </Link>
            <p>{d.footer}</p>
            <p>{s.address}</p>
          </div>
          <div>
            <h4>{d.catalog}</h4>
            <div className="footer-links">
              {(["sale", "rent", "new", "commercial"] as RouteKey[]).map(
                (k) => (
                  <Link href={href(l, k)} key={k}>
                    {d[k]}
                  </Link>
                ),
              )}
            </div>
          </div>
          <div>
            <h4>{d.about}</h4>
            <div className="footer-links">
              {(["team", "services", "blog", "contact"] as RouteKey[]).map(
                (k) => (
                  <Link href={href(l, k)} key={k}>
                    {d[k]}
                  </Link>
                ),
              )}
            </div>
          </div>
          <div>
            <h4>{d.contact}</h4>
            <div className="footer-links">
              {!s.email.endsWith(".invalid") && (
                <a href={`mailto:${s.email}`}>{s.email}</a>
              )}
              {s.phone && (
                <a href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}>{s.phone}</a>
              )}
              <Link href={href(l, "valuation")}>{d.valuation} ↗</Link>
              <Link href="/admin">
                {l === "sk"
                  ? "Prihlásenie tímu"
                  : l === "uk"
                    ? "Вхід для команди"
                    : "Team sign in"}{" "}
                ↗
              </Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {s.brand} · DEMO
          </span>
          <div className="button-row">
            {(["privacy", "cookies", "terms"] as RouteKey[]).map((k) => (
              <Link href={href(l, k)} key={k}>
                {d[k]}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
