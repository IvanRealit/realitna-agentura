import Link from "next/link";
import { dictionaries, href, type Locale } from "@/lib/i18n";
export function PageHead({
  l,
  title,
  description,
}: {
  l: Locale;
  title: string;
  description?: string;
}) {
  const d = dictionaries[l];
  return (
    <section className="container page-head">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href={href(l)}>{d.home}</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </section>
  );
}
