import Link from "next/link";
import { dictionaries, href, label, type Locale } from "@/lib/i18n";
import type { Query } from "@/lib/catalog";
import { Icon } from "./icons";
export function Filters({
  l,
  q,
  cities,
  regions,
}: {
  l: Locale;
  q: Query;
  cities: string[];
  regions: string[];
}) {
  const d = dictionaries[l];
  function select(
    name: string,
    title: string,
    options: string[],
    translate = false,
  ) {
    return (
      <label>
        {title}
        <select name={name} defaultValue={q[name] ?? ""}>
          <option value="">—</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {translate ? label(v, l) : v}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <form className="filters" action={href(l, "catalog")}>
      <div className="filter-grid">
        {select("city", d.city, cities)}
        {select("region", d.region, regions)}
        {select("transaction", `${d.sale} / ${d.rent}`, ["SALE", "RENT"], true)}
        {select(
          "type",
          d.type,
          ["APARTMENT", "HOUSE", "LAND", "COMMERCIAL"],
          true,
        )}
        {[
          ["minPrice", d.minPrice],
          ["maxPrice", d.maxPrice],
          ["minArea", d.minArea],
          ["maxArea", d.maxArea],
        ].map(([name, title]) => (
          <label key={name}>
            {title}
            <input
              type="number"
              min="0"
              name={name}
              defaultValue={q[name]}
              step={name.includes("Area") ? "0.1" : "1"}
            />
          </label>
        ))}
        {select("rooms", d.rooms, ["1", "2", "3", "4", "5", "6"])}
        {select(
          "condition",
          d.condition,
          ["NEW", "RENOVATED", "ORIGINAL"],
          true,
        )}
        <label>
          {d.sort}
          <select name="sort" defaultValue={q.sort ?? "newest"}>
            <option value="newest">{d.newest}</option>
            <option value="priceAsc">{d.priceAsc}</option>
            <option value="priceDesc">{d.priceDesc}</option>
          </select>
        </label>
        <div className="filter-submit">
          <button className="button">
            <Icon name="search" />
            {d.search}
          </button>
        </div>
      </div>
      <Link href={href(l, "catalog")} className="reset-link">
        {d.reset}
      </Link>
      <input type="hidden" name="view" value={q.view ?? "list"} />
    </form>
  );
}
