"use client";
import { SecuritySettings } from "./security-settings";
import {
  staffNavigation,
  can,
  roles,
  isResource,
} from "@/modules/access/policy";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "./icons";
type RecordData = Record<string, unknown>;
type User = { id: string; name: string; role: string };
const names: Record<string, string> = {
  dashboard: "Prehľad",
  properties: "Nehnuteľnosti",
  leads: "Dopyty / CRM",
  users: "Tím a oprávnenia",
  content: "Stránky a magazín",
  settings: "Nastavenia",
  audit: "Denník aktivít",
  branches: "Pobočky",
  security: "Bezpečnosť účtu",
};
const newProperty = (user: User) => ({
  slug: "",
  translations: { sk: { title: "", description: "" } },
  city: "",
  region: "",
  address: "DEMO — bez presnej adresy",
  type: "APARTMENT",
  transaction: "SALE",
  condition: "NEW",
  price: 0,
  area: 1,
  rooms: 1,
  status: "DRAFT",
  demo: true,
  featured: false,
  latitude: null,
  longitude: null,
  images: [],
  videoUrl: "",
  tourUrl: "",
  floorPlan: "",
  brochure: "",
  agentId: user.id,
  seo: {},
});
const newContent = () => ({
  slug: "",
  kind: "BLOG",
  translations: { sk: { title: "", description: "" } },
  published: false,
  seo: {},
});
export function Login({ brand }: { brand: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-shell">
      <div className="login-card">
        <Link href="/sk" className="brand">
          {brand}
          <span className="brand-dot">.</span>
        </Link>
        <h1>Vitajte späť.</h1>
        <p>Zabezpečený prístup pre tím agentúry.</p>
        <form
          action="/api/auth/login"
          method="post"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: f.get("email"),
                  password: f.get("password"),
                  code: f.get("code"),
                }),
              });
              if (!r.ok) {
                setError(
                  r.status === 429
                    ? "Príliš veľa pokusov. Skúste neskôr."
                    : "Skontrolujte heslo a prípadný nepoužitý MFA kód.",
                );
              } else {
                router.refresh();
                router.push("/admin");
              }
            } catch {
              setError("Služba nie je dostupná.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            E-mail
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Heslo
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            Kód MFA alebo obnovovací kód (ak je zapnuté)
            <input name="code" autoComplete="one-time-code" maxLength={100} />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "…" : "Prihlásiť sa →"}
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
        <p style={{ marginTop: 25 }}>
          Prvý účet vytvorte bezpečne cez db:bootstrap a lokálne premenné.
          Verejná registrácia je vypnutá.
        </p>
      </div>
    </div>
  );
}
export function Admin({
  user,
  resource,
  stats,
  brand,
}: {
  user: User;
  resource: string;
  brand: string;
  stats: { properties: number; leads: number; newLeads: number };
}) {
  const [notifications, setNotifications] = useState(stats.newLeads);
  useEffect(() => {
    const update = () => {
      fetch("/api/admin/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => {
          if (v) setNotifications(v.newLeads);
        })
        .catch(() => {});
    };
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);
  const router = useRouter();
  const [rows, setRows] = useState<RecordData[]>([]);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const allowed = staffNavigation(user.role);
  const readOnlyProperty = Boolean(
    editing &&
    resource === "properties" &&
    !can(user.role, "properties", "publish") &&
    !["DRAFT", "REVIEW"].includes(String(editing.status)),
  );
  const load = useCallback(async () => {
    if (["dashboard", "security"].includes(resource)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/${resource}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      setRows(arr);
      if (resource === "settings" && data) setEditing(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    } finally {
      setBusy(false);
    }
  }, [resource]);
  useEffect(() => {
    if (["dashboard", "security"].includes(resource)) return;
    let active = true;
    fetch(`/api/admin/${resource}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (!active) return;
        setRows(Array.isArray(data) ? data : data ? [data] : []);
        if (resource === "settings" && data) setEditing(data);
      })
      .catch((e) => {
        if (active) setError(String(e.message));
      });
    return () => {
      active = false;
    };
  }, [resource]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = editing.id as string | undefined;
      const r = await fetch(`/api/admin/${resource}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resource === "leads"
            ? { ...editing, agentId: editing.agentId || null }
            : editing,
        ),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          (data.code === "VERSION_CONFLICT"
            ? "Záznam medzitým upravil kolega. Rozpísané údaje zostali v editore; pred ďalším uložením načítajte aktuálnu verziu."
            : data.error) +
            (data.issues
              ? `: ${data.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
              : ""),
        );
      setEditing(null);
      setNotice("Zmeny boli uložené.");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: RecordData) {
    if (!confirm("Naozaj odstrániť tento záznam?")) return;
    setError("");
    try {
      const r = await fetch(`/api/admin/${resource}/${row.id}`, {
        method: "DELETE",
        headers:
          resource === "properties" ? { "If-Match": `"${row.version}"` } : {},
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    }
  }
  function create() {
    setError("");
    setEditing(
      resource === "properties"
        ? newProperty(user)
        : resource === "content"
          ? newContent()
          : resource === "branches"
            ? {
                name: "",
                city: "",
                address: "",
                phone: "",
                email: "",
                active: true,
                publicContact: false,
                commissionBps: 0,
              }
            : {
                name: "",
                email: "",
                password: "",
                role: "AGENT",
                active: true,
                phone: "",
                avatar: "",
                bio: {},
              },
    );
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/sk" className="brand">
          {brand}.
        </Link>
        <nav>
          {allowed.map((k) => (
            <Link
              className={resource === k ? "active" : ""}
              href={k === "dashboard" ? "/admin" : `/admin/${k}`}
              key={k}
            >
              {names[k]}
              {k === "leads" && notifications > 0 ? ` (${notifications})` : ""}
            </Link>
          ))}
        </nav>
        <p>
          {user.name} · {user.role}
        </p>
        <form
          action="/api/auth/logout"
          method="post"
          onSubmit={async (e) => {
            e.preventDefault();
            await fetch("/api/auth/logout", { method: "POST" });
            router.refresh();
          }}
        >
          <button
            type="submit"
            className="button outline"
            style={{ color: "white", borderColor: "#ffffff55" }}
          >
            Odhlásiť sa
          </button>
        </form>
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <div>
            <div className="eyebrow">Pracovný priestor / {user.role}</div>
            <h1>{names[resource]}</h1>
          </div>
          {isResource(resource) &&
            can(user.role, resource, "create") &&
            resource !== "settings" && (
              <button className="button" onClick={create}>
                + Nový záznam
              </button>
            )}
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="success">
            {notice}
          </div>
        )}
        {resource === "security" ? (
          <SecuritySettings role={user.role} />
        ) : resource === "dashboard" ? (
          <>
            <div className="admin-stats">
              <div className="admin-stat">
                <strong>{stats.properties}</strong>
                <span>Nehnuteľnosti</span>
              </div>
              <div className="admin-stat">
                <strong>{stats.leads}</strong>
                <span>Dopyty</span>
              </div>
              <div className="admin-stat">
                <strong>{notifications}</strong>
                <span>
                  <span className="status-dot" />
                  Nové dopyty — vyžadujú pozornosť
                </span>
              </div>
            </div>
            <div className="content-card">
              <h2>Všetko na jednom mieste.</h2>
              <p>
                {user.role === "AGENT"
                  ? "Vidíte iba vlastné nehnuteľnosti a pridelené dopyty. Publikovanie a priradenie spravuje manažér."
                  : "Spravujte ponuky, dopyty a publikovaný obsah. Dôležité zmeny sa zaznamenávajú do denníka."}
              </p>
              <div className="button-row">
                {can(user.role, "properties", "read") && (
                  <Link href="/admin/properties" className="button">
                    Nehnuteľnosti →
                  </Link>
                )}
                {can(user.role, "leads", "read") && (
                  <Link href="/admin/leads" className="button outline">
                    Dopyty →
                  </Link>
                )}
                <Link href="/admin/security" className="button outline">
                  Bezpečnosť účtu →
                </Link>
              </div>
            </div>
            <p className="admin-hint">
              REALVIA / backOFFICE: integračné rozhranie je pripravené v kóde.
              Žiadne externé API nie je pripojené. Notifikácie sú dostupné v
              prehľade nových dopytov; e-mailový poskytovateľ nie je
              nakonfigurovaný.
            </p>
          </>
        ) : (
          <>
            {editing && (
              <form className="admin-editor" onSubmit={save}>
                <h2>{editing.id ? "Upraviť záznam" : "Nový záznam"}</h2>
                <fieldset className="editor-fields" disabled={readOnlyProperty}>
                  <Editor
                    resource={resource}
                    data={editing}
                    setData={setEditing}
                    user={user}
                  />
                </fieldset>
                <div className="button-row">
                  <button
                    className="button"
                    disabled={busy || readOnlyProperty}
                  >
                    {busy ? "…" : "Uložiť zmeny"}
                  </button>
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => setEditing(null)}
                  >
                    Zrušiť
                  </button>
                </div>
              </form>
            )}
            {busy && <p role="status">Načítavanie…</p>}
            {resource !== "settings" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Názov / ID</th>
                      <th>Typ / Stav</th>
                      <th>Detail</th>
                      {isResource(resource) &&
                        can(user.role, resource, "update") && <th>Akcie</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={String(row.id)}>
                        <td>
                          {rowTitle(row)}
                          {resource === "leads" && (
                            <>
                              <br />
                              {String(row.email)}
                              <br />
                              {String(row.phone ?? "")}
                            </>
                          )}
                        </td>
                        <td>
                          {String(
                            row.status ??
                              row.role ??
                              row.kind ??
                              row.action ??
                              "",
                          )}
                        </td>
                        <td>
                          {resource === "branches"
                            ? (() => {
                                const counts = row._count as
                                  | {
                                      users: number;
                                      properties: number;
                                      leads: number;
                                    }
                                  | undefined;
                                return `${row.city} · Tím: ${counts?.users ?? 0} · Ponuky: ${counts?.properties ?? 0} · Dopyty: ${counts?.leads ?? 0}`;
                              })()
                            : resource === "leads"
                              ? String(row.message)
                              : resource === "audit"
                                ? `${row.resource} · ${row.resourceId} · ${row.actorId}`
                                : String(
                                    row.city ?? row.slug ?? row.email ?? "",
                                  )}
                        </td>
                        {isResource(resource) &&
                          can(user.role, resource, "update") && (
                            <td>
                              <button
                                onClick={() => {
                                  setEditing(
                                    resource === "leads"
                                      ? {
                                          id: row.id,
                                          status: row.status,
                                          notes: row.notes,
                                          agentId: row.agentId,
                                        }
                                      : row,
                                  );
                                  setError("");
                                }}
                              >
                                Upraviť
                              </button>
                              {isResource(resource) &&
                                can(user.role, resource, "delete") && (
                                  <button
                                    style={{ marginLeft: 12, color: "#923c30" }}
                                    onClick={() => remove(row)}
                                  >
                                    Odstrániť
                                  </button>
                                )}
                            </td>
                          )}
                      </tr>
                    ))}
                    {!rows.length && !busy && (
                      <tr>
                        <td colSpan={4}>Zatiaľ žiadne záznamy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
      <nav className="crm-bottom-nav" aria-label="Rýchla navigácia CRM">
        {[
          ["dashboard", "Prehľad", "menu"],
          ["properties", "Ponuky", "pin"],
          ["leads", "Dopyty", "check"],
          ["security", "Účet", "menu"],
        ]
          .filter(([key]) => allowed.includes(key))
          .map(([key, title, icon]) => (
            <Link
              key={key}
              href={key === "dashboard" ? "/admin" : `/admin/${key}`}
              aria-current={resource === key ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{title}</span>
            </Link>
          ))}
      </nav>
    </div>
  );
}
function rowTitle(row: RecordData) {
  const tr = row.translations as Record<string, { title: string }> | undefined;
  return tr?.sk?.title ?? String(row.name ?? row.createdAt ?? row.id);
}
function Editor({
  resource,
  data,
  setData,
  user,
}: {
  resource: string;
  data: RecordData;
  setData: (v: RecordData) => void;
  user: User;
}) {
  const [uploadError, setUploadError] = useState("");
  const set = (key: string, v: unknown) => setData({ ...data, [key]: v });
  function input(key: string, title: string, type = "text", required = true) {
    return (
      <label key={key}>
        {title}
        <input
          type={type}
          required={required}
          value={String(data[key] ?? "")}
          onChange={(e) =>
            set(
              key,
              type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
          step={type === "number" ? "any" : undefined}
        />
      </label>
    );
  }
  function select(
    key: string,
    title: string,
    options: string[],
    disabled = false,
  ) {
    return (
      <label key={key}>
        {title}
        <select
          disabled={disabled}
          value={String(data[key] ?? "")}
          onChange={(e) => set(key, e.target.value)}
        >
          {options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    );
  }
  function check(key: string, title: string, disabled = false) {
    return (
      <label className="checkbox" key={key}>
        <input
          disabled={disabled}
          type="checkbox"
          checked={Boolean(data[key])}
          onChange={(e) => set(key, e.target.checked)}
        />
        {title}
      </label>
    );
  }
  function textArea(key: string, title: string) {
    return (
      <label className="wide">
        {title}
        <textarea
          rows={5}
          value={String(data[key] ?? "")}
          onChange={(e) => set(key, e.target.value)}
        />
      </label>
    );
  }
  function translate(field: string) {
    const tr = (data[field] ?? {}) as Record<
      string,
      { title?: string; description?: string }
    >;
    return (
      <div className="wide">
        {["sk", "uk", "en"].map((l) => (
          <details open={l === "sk"} key={l}>
            <summary>
              {field === "seo" ? "SEO" : "Obsah"} · {l.toUpperCase()}{" "}
              {l !== "sk" ? "(voliteľné, fallback SK)" : ""}
            </summary>
            <div className="form-grid" style={{ margin: "15px 0" }}>
              <label className="wide">
                {field === "seo" ? "SEO titulok" : "Nadpis"}
                <input
                  value={tr[l]?.title ?? ""}
                  required={field === "translations" && l === "sk"}
                  onChange={(e) => {
                    const next = {
                      ...tr,
                      [l]: { ...tr[l], title: e.target.value },
                    };
                    if (!next[l].title && !next[l].description) delete next[l];
                    set(field, next);
                  }}
                />
              </label>
              <label className="wide">
                {field === "seo" ? "Meta popis" : "Popis (text, bez HTML)"}
                <textarea
                  rows={field === "seo" ? 2 : 6}
                  value={tr[l]?.description ?? ""}
                  required={field === "translations" && l === "sk"}
                  onChange={(e) => {
                    const next = {
                      ...tr,
                      [l]: { ...tr[l], description: e.target.value },
                    };
                    if (!next[l].title && !next[l].description) delete next[l];
                    set(field, next);
                  }}
                />
              </label>
            </div>
          </details>
        ))}
      </div>
    );
  }
  if (resource === "properties")
    return (
      <>
        <div className="form-grid">
          {input("slug", "URL slug")}
          {input("city", "Mesto")}
          {input("region", "Región")}
          {input("address", "Adresa (DEMO: bez presnej adresy)")}
          {select("type", "Typ", ["APARTMENT", "HOUSE", "LAND", "COMMERCIAL"])}
          {select("transaction", "Transakcia", ["SALE", "RENT"])}
          {select("condition", "Stav", ["NEW", "RENOVATED", "ORIGINAL"])}
          {input("price", "Cena EUR", "number")}
          {input("area", "Plocha m²", "number")}
          {input("rooms", "Izby", "number")}
          {select(
            "status",
            "Publikovanie",
            !can(user.role, "properties", "publish") &&
              ["DRAFT", "REVIEW"].includes(String(data.status))
              ? ["DRAFT", "REVIEW"]
              : [
                  "DRAFT",
                  "REVIEW",
                  "PUBLISHED",
                  "RESERVED",
                  "SOLD",
                  "RENTED",
                  "ARCHIVED",
                ],
            !can(user.role, "properties", "publish") &&
              !["DRAFT", "REVIEW"].includes(String(data.status)),
          )}
          <AgentSelect
            value={String(data.agentId ?? "")}
            onChange={(v) => set("agentId", v)}
            disabled={!can(user.role, "properties", "assign")}
          />
          {["latitude", "longitude"].map((k) => (
            <label key={k}>
              {k}
              <input
                type="number"
                step="any"
                value={String(data[k] ?? "")}
                onChange={(e) =>
                  set(k, e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
          ))}
          {check("demo", "DEMO ponuka", user.role === "AGENT")}
          {check("featured", "Odporúčaná ponuka", user.role === "AGENT")}
          {translate("translations")}
          {translate("seo")}
        </div>
        <p className="admin-hint">
          Koncept → REVIEW (na kontrolu) → publikovanie manažérom. Publikovanú
          ponuku môže agent meniť až po vrátení do konceptu. Pred publikovaním
          treba fotografiu, kladnú cenu a úplný slovenský opis.
        </p>
        <h2>Fotografie</h2>
        <p className="admin-hint">
          JPEG, PNG alebo WebP, najviac 8 MB. Súbory sa overia a prevedú na WebP
          bez metadát. Prvá fotografia je titulná. URL používajte iba z
          dôveryhodných zdrojov; vzdialené obrázky povoľte aj v next.config.ts.
        </p>
        <div className="media-upload">
          <label>
            Nahrať obrázok
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploadError("");
                const form = new FormData();
                form.set("file", f);
                try {
                  const r = await fetch("/api/media", {
                    method: "POST",
                    body: form,
                  });
                  const v = await r.json();
                  if (!r.ok) throw new Error(v.error);
                  set("images", [...(data.images as string[]), v.url]);
                } catch (err) {
                  setUploadError(
                    err instanceof Error ? err.message : "Upload failed",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError && <p className="error">{uploadError}</p>}
        <div className="media-list">
          {(data.images as string[]).map((url, i) => (
            <div className="media-item" key={`${url}-${i}`}>
              <Image
                src={url}
                alt={`Image ${i + 1}`}
                width={110}
                height={75}
                unoptimized
              />
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => {
                    const imgs = [...(data.images as string[])];
                    if (i > 0) [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                    set("images", imgs);
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "images",
                      (data.images as string[]).filter((_, n) => n !== i),
                    )
                  }
                >
                  Odstrániť
                </button>
              </div>
            </div>
          ))}
        </div>
        <label>
          URL fotografií (jeden riadok = jedna fotografia)
          <textarea
            rows={3}
            value={(data.images as string[]).join("\n")}
            onChange={(e) =>
              set("images", e.target.value.split("\n").filter(Boolean))
            }
          />
        </label>
        <h2>Ďalšie materiály</h2>
        <div className="form-grid">
          {input("videoUrl", "Video HTTPS URL", "url", false)}
          {input("tourUrl", "Virtuálna prehliadka HTTPS URL", "url", false)}
          {input("floorPlan", "Pôdorys URL", "text", false)}
          {input("brochure", "PDF brožúra HTTPS URL", "url", false)}
        </div>
      </>
    );
  if (resource === "content")
    return (
      <div className="form-grid">
        {input("slug", "Slug (systémové stránky: about, services, contact…)")}
        {select("kind", "Typ", ["BLOG", "PAGE"])}
        {check("published", "Publikované")}
        {translate("translations")}
        {translate("seo")}
      </div>
    );
  if (resource === "leads")
    return (
      <div className="form-grid">
        {select("status", "Stav", ["NEW", "IN_PROGRESS", "CLOSED"])}
        {can(user.role, "leads", "assign") && (
          <AgentSelect
            value={String(data.agentId ?? "")}
            onChange={(v) => set("agentId", v || null)}
            optional
          />
        )}
        {textArea("notes", "Interné poznámky")}
      </div>
    );
  if (resource === "users")
    return (
      <div className="form-grid">
        {input("name", "Meno")}
        {input("email", "E-mail", "email")}
        {
          <label>
            Nové heslo (min. 12 znakov)
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required={!data.id}
              value={String(data.password ?? "")}
              onChange={(e) => {
                const v = { ...data };
                if (e.target.value) v.password = e.target.value;
                else delete v.password;
                setData(v);
              }}
            />
          </label>
        }
        {select(
          "role",
          "Rola",
          roles.filter(
            (r) => user.role === "SUPER_ADMIN" || r !== "SUPER_ADMIN",
          ),
        )}
        <BranchSelect
          value={String(data.branchId ?? "")}
          onChange={(v) => set("branchId", v || null)}
        />
        {input("phone", "Telefón", "tel", false)}
        {check("active", "Aktívny účet")}
        {input("avatar", "Fotografia (lokálna alebo HTTPS URL)", "text", false)}
        {translate("bio")}
      </div>
    );
  if (resource === "branches")
    return (
      <div className="form-grid">
        {input("name", "Názov pobočky")}
        {input("city", "Mesto")}
        {input("address", "Adresa", "text", false)}
        {input("phone", "Telefón", "tel", false)}
        {input("email", "E-mail", "email", false)}
        {input(
          "commissionBps",
          "Podiel pobočky (basis points, 100 = 1%)",
          "number",
        )}
        {check("active", "Aktívna pobočka")}
        {check("publicContact", "Verejný kontakt")}
      </div>
    );
  if (resource === "settings")
    return (
      <div className="form-grid">
        {input("brand", "Značka")}
        {input("email", "Kontaktný e-mail", "email")}
        {input("phone", "Telefón", "tel", false)}
        {input("address", "Adresa")}
        {input("retentionDays", "Uchovanie dopytov (dni)", "number")}
      </div>
    );
  return null;
}

function AgentSelect({
  value,
  onChange,
  disabled = false,
  optional = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  optional?: boolean;
}) {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/agents")
      .then(async (r) => {
        if (!r.ok) throw new Error("Unavailable");
        return r.json();
      })
      .then((v) => {
        if (active) setAgents(v);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <label>
      Zodpovedný agent
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={!optional}
      >
        {optional && <option value="">Nepriradené</option>}
        {!optional && !agents.length && (
          <option value={value}>
            {error ? "Tím sa nepodarilo načítať" : "Načítavanie tímu…"}
          </option>
        )}
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {error && <span role="alert">Obnovte stránku a skúste znova.</span>}
    </label>
  );
}

function BranchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [rows, setRows] = useState<
    { id: string; name: string; active: boolean }[]
  >([]);
  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((v) => {
        if (Array.isArray(v)) setRows(v);
      })
      .catch(() => {});
  }, []);
  return (
    <label>
      Pobočka
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Bez pobočky</option>
        {rows.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {!b.active ? " (archív)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
