import Link from "next/link";
import { dictionaries, href, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/icons";
export function Services({ l }: { l: Locale }) {
  const d = dictionaries[l];
  return (
    <div className="services-grid">
      {[1, 2, 3].map((n) => (
        <article className="service-card" key={n}>
          <div className="service-number">0{n}</div>
          <h3>{d[`service${n}` as "service1"]}</h3>
          <p>{d[`serviceBody${n}` as "serviceBody1"]}</p>
          <Link
            href={href(l, n === 3 ? "valuation" : "contact")}
            className="text-link"
          >
            {n === 3 ? d.valuation : d.contact}
            <Icon name="arrow" />
          </Link>
        </article>
      ))}
    </div>
  );
}
