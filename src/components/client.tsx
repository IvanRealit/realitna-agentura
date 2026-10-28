"use client";
import { useState, useSyncExternalStore, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  dictionaries,
  href,
  type Locale,
  type RouteKey,
  routes,
} from "@/lib/i18n";
import { Icon } from "./icons";
const favoriteKey = "domov-favorites";
function snapshot() {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(favoriteKey) ?? "[]");
    return Array.isArray(v) && v.every((x) => typeof x === "string")
      ? JSON.stringify(v)
      : "[]";
  } catch {
    return "[]";
  }
}
function favorites(): string[] {
  try {
    const v = JSON.parse(snapshot());
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("favorites", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("favorites", cb);
    window.removeEventListener("storage", cb);
  };
}
export function Favorite({ id, l }: { id: string; l: Locale }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved = (JSON.parse(raw) as string[]).includes(id);
  return (
    <button
      className={`favorite ${saved ? "is-saved" : ""}`}
      aria-label={dictionaries[l].favorites}
      aria-pressed={saved}
      onClick={() => {
        const next = saved
          ? favorites().filter((v) => v !== id)
          : [...new Set([...favorites(), id])];
        localStorage.setItem(favoriteKey, JSON.stringify(next));
        window.dispatchEvent(new Event("favorites"));
      }}
    >
      <Icon name="heart" />
    </button>
  );
}
export function FavoriteGrid({
  children,
  ids,
  l,
}: {
  children: React.ReactNode[];
  ids: string[];
  l: Locale;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved = JSON.parse(raw) as string[];
  return saved.length ? (
    <div className="property-grid">
      {children.filter((_, i) => saved.includes(ids[i]))}
    </div>
  ) : (
    <p className="empty">{dictionaries[l].empty}</p>
  );
}
export function Header({
  l,
  brand,
  current,
  slug,
}: {
  l: Locale;
  brand: string;
  current?: RouteKey;
  slug?: string;
}) {
  const [open, setOpen] = useState(false);
  const d = dictionaries[l];
  return (
    <header className="header">
      <div className="container nav">
        <Link href={href(l)} className="brand" aria-label={brand}>
          <span className="brand-mark">⌂</span>
          {brand}
          <span className="brand-dot">.</span>
        </Link>
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main"
        >
          <Link href={href(l, "catalog")} onClick={() => setOpen(false)}>
            {d.catalog}
          </Link>
          <Link href={href(l, "services")} onClick={() => setOpen(false)}>
            {d.services}
          </Link>
          <Link href={href(l, "about")} onClick={() => setOpen(false)}>
            {d.about}
          </Link>
          <Link href={href(l, "blog")} onClick={() => setOpen(false)}>
            {d.blog}
          </Link>
          <Link
            href={href(l, "contact")}
            className="nav-contact"
            onClick={() => setOpen(false)}
          >
            {d.contact} <Icon name="arrow" />
          </Link>
        </nav>
        <div className="nav-tools">
          <Link href={href(l, "favorites")} aria-label={d.favorites}>
            <Icon name="heart" />
          </Link>
          <div className="language-switch" aria-label="Language">
            {(["sk", "uk", "en"] as Locale[]).map((lang) => (
              <Link
                href={href(lang, current, slug)}
                hrefLang={lang}
                className={lang === l ? "active" : ""}
                key={lang}
              >
                {lang.toUpperCase()}
              </Link>
            ))}
          </div>
          <button
            className="menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}
function consentSnapshot() {
  try {
    const v = JSON.parse(localStorage.getItem("domov-consent") ?? "null");
    return v?.version === 1 && Date.now() - v.at < 180 * 86400000
      ? "valid"
      : "missing";
  } catch {
    return "missing";
  }
}
function consentSubscribe(cb: () => void) {
  window.addEventListener("consent-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("consent-change", cb);
    window.removeEventListener("storage", cb);
  };
}
export function Consent({ l }: { l: Locale }) {
  const d = dictionaries[l];
  const valid = useSyncExternalStore(
    consentSubscribe,
    consentSnapshot,
    () => "valid",
  );
  const [force, setForce] = useState(false);
  const show = force || valid === "missing";
  function save(analytics: boolean) {
    const value = { essential: true, analytics, version: 1, at: Date.now() };
    localStorage.setItem("domov-consent", JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("consent-change", { detail: value }));
    setForce(false);
  }
  return (
    <>
      <button className="cookie-settings" onClick={() => setForce(true)}>
        {d.settings}
      </button>
      {show && (
        <section className="cookie-banner" aria-label={d.settings}>
          <div>
            <strong>{d.cookies}</strong>
            <p>
              {d.cookieText}{" "}
              <Link href={href(l, "cookies")}>{d.cookies} ↗</Link>
            </p>
          </div>
          <div className="button-row">
            <button className="button outline" onClick={() => save(false)}>
              {d.necessary}
            </button>
            <button className="button" onClick={() => save(true)}>
              {d.accept}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
export function LeadForm({
  l,
  propertyId,
  kind = "CONSULTATION",
}: {
  l: Locale;
  propertyId?: string;
  kind?: string;
}) {
  const d = dictionaries[l];
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setState("");
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: f.get("message"),
          kind: f.get("kind"),
          locale: l,
          consent: f.get("consent") === "on",
          website: f.get("website"),
          propertyId,
        }),
      });
      setState(r.ok ? "success" : r.status === 429 ? "rate" : "error");
      if (r.ok) form.reset();
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          {d.name}
          <input
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label>
          {d.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          {d.phone}
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        <label>
          {d.formKind}
          <select name="kind" defaultValue={kind}>
            <option value="CONSULTATION">{d.consultation}</option>
            <option value="VIEWING">{d.viewing}</option>
            <option value="SELL">{d.sell}</option>
            <option value="VALUATION">{d.valuation}</option>
          </select>
        </label>
      </div>
      <label>
        {d.message}
        <textarea
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={5000}
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="consent" required />
        <span>
          {d.consent} <Link href={href(l, "privacy")}>{d.privacy} ↗</Link>
        </span>
      </label>
      <button className="button" disabled={busy}>
        {busy ? "…" : d.submit}
        <Icon name="arrow" />
      </button>
      <p role="status">
        {state === "success"
          ? d.success
          : state === "rate"
            ? l === "sk"
              ? "Príliš veľa žiadostí. Skúste neskôr."
              : l === "uk"
                ? "Забагато запитів. Спробуйте пізніше."
                : "Too many requests. Please try later."
            : state
              ? d.error
              : ""}
      </p>
    </form>
  );
}
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (zoom) dialog.current?.showModal();
    else dialog.current?.close();
  }, [zoom]);
  const src = images[active] ?? "/images/placeholder.svg";
  return (
    <div className="gallery">
      <button
        className="gallery-main"
        onClick={() => setZoom(true)}
        aria-label={title}
      >
        <Image
          src={src}
          alt={title}
          fill
          priority
          sizes="(max-width: 800px) 100vw, 70vw"
        />
      </button>
      <div className="gallery-thumbs">
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            className={i === active ? "active" : ""}
            onClick={() => setActive(i)}
            aria-label={`${title} ${i + 1}`}
          >
            <Image
              src={url}
              alt={`${title} ${i + 1}`}
              width={180}
              height={110}
            />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setZoom(false)}
        aria-label={title}
        className="lightbox"
        onKeyDown={(e) => {
          if (e.key === "Escape") setZoom(false);
        }}
      >
        <button autoFocus onClick={() => setZoom(false)} aria-label="Close">
          <Icon name="close" />
        </button>
        <Image src={src} alt={title} fill sizes="100vw" />
        <button
          className="lightbox-prev"
          onClick={() =>
            setActive(
              (active - 1 + Math.max(1, images.length)) %
                Math.max(1, images.length),
            )
          }
        >
          ←
        </button>
        <button
          className="lightbox-next"
          onClick={() => setActive((active + 1) % Math.max(1, images.length))}
        >
          →
        </button>
      </dialog>
    </div>
  );
}
export function MapView({
  l,
  points,
}: {
  l: Locale;
  points: {
    title: string;
    lat: number;
    lng: number;
    url: string;
    demo: boolean;
  }[];
}) {
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const d = dictionaries[l];
  const p = points[index];
  if (!p) return <p className="empty">{d.empty}</p>;
  const bbox = `${p.lng - 0.025},${p.lat - 0.015},${p.lng + 0.025},${p.lat + 0.015}`;
  return (
    <div className="map-view">
      <div className="map-canvas">
        {loaded ? (
          <iframe
            title={d.map}
            loading="lazy"
            referrerPolicy="no-referrer"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat},${p.lng}`}
          />
        ) : (
          <div className="map-placeholder">
            <Icon name="pin" />
            <p>{p.demo ? d.demo : p.title}</p>
            <button className="button outline" onClick={() => setLoaded(true)}>
              {d.mapConsent}
            </button>
          </div>
        )}
      </div>
      <div className="map-points">
        {points.map((point, i) => (
          <div key={point.url} className={index === i ? "active" : ""}>
            <button onClick={() => setIndex(i)}>
              <Icon name="pin" />
              {point.title}
            </button>
            <Link href={point.url}>{d.detail} ↗</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
export function LanguageLinks({
  l,
  current,
}: {
  l: Locale;
  current?: RouteKey;
}) {
  return (
    <>
      {Object.keys(routes).length > 0 && (
        <Link href={href(l, current)}>{dictionaries[l].home}</Link>
      )}
    </>
  );
}
