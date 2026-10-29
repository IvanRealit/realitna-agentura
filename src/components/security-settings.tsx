"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "@/modules/access/policy";
type Data = {
  profile: { name: string; phone: string | null };
  mfaEnabled: boolean;
  mfaConfigured: boolean;
  sessions: {
    id: string;
    createdAt: string;
    expiresAt: string;
    current: boolean;
  }[];
  events: {
    id: string;
    userId: string | null;
    success: boolean;
    reason: string;
    createdAt: string;
  }[];
};
export function SecuritySettings({ role }: { role: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [issued, setIssued] = useState("");
  const [users, setUsers] = useState<
    { id: string; name: string; active: boolean }[]
  >([]);
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/identity/security", { cache: "no-store" });
    if (!r.ok) throw new Error("Prihláste sa znova.");
    setData(await r.json());
  }
  useEffect(() => {
    let active = true;
    fetch("/api/identity/security", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Prihláste sa znova.");
        return r.json();
      })
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (can(role, "users", "read"))
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((v) => {
          if (active && Array.isArray(v)) setUsers(v);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [role]);
  async function post(action: string, body: Record<string, unknown>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await fetch(`/api/identity/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error ?? "Operácia zlyhala.");
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operácia zlyhala.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  function form(
    action: string,
    after?: (value: Record<string, unknown>) => void,
  ) {
    return async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const result = await post(
        action,
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      if (result) {
        setNotice("Zmena bola uložená.");
        if (after) after(result);
        else await load();
      }
    };
  }
  return (
    <section className="security-settings">
      <p>
        Správa vlastného profilu, hesla, dvojfaktorového overenia a relácií.
        Citlivé údaje sa neukladajú do prehliadača.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      {codes.length > 0 && (
        <div role="status" className="editor">
          <h2>Jednorazové obnovovacie kódy</h2>
          <p>
            Uložte ich do bezpečného správcu hesiel. Zobrazia sa iba teraz. MFA
            je zapnuté a všetky relácie boli odhlásené.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {codes.join("\n")}
          </pre>
          <button
            className="button"
            onClick={() => {
              setCodes([]);
              router.refresh();
            }}
          >
            Kódy sú bezpečne uložené — prihlásiť sa
          </button>
        </div>
      )}
      {data && codes.length === 0 && (
        <>
          <form className="editor" method="post" onSubmit={form("profile")}>
            <h2>Môj profil</h2>
            <div className="form-grid">
              <label>
                Meno
                <input
                  name="name"
                  defaultValue={data.profile.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Telefón
                <input
                  name="phone"
                  type="tel"
                  defaultValue={data.profile.phone ?? ""}
                  maxLength={40}
                />
              </label>
            </div>
            <button className="button" disabled={busy}>
              Uložiť profil
            </button>
          </form>
          <form
            className="editor"
            method="post"
            onSubmit={form("password", () => router.refresh())}
          >
            <h2>Zmena hesla</h2>
            <p>Po zmene sa ukončia všetky vaše relácie.</p>
            <Password />
            <label>
              Nové heslo
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
              />
            </label>
            <Factor />
            <button className="button" disabled={busy}>
              Zmeniť heslo a odhlásiť
            </button>
          </form>
          <section className="editor">
            <h2>Dvojfaktorové overenie</h2>
            <p>
              {data.mfaEnabled
                ? "MFA je zapnuté. Prihlásenie vyžaduje aktuálny TOTP alebo jednorazový obnovovací kód."
                : "MFA zatiaľ nie je zapnuté."}
            </p>
            {!data.mfaConfigured && (
              <p>
                Správca servera musí nastaviť MFA_ENCRYPTION_KEY. Bez neho sa
                nastavenie nespustí.
              </p>
            )}
            {!data.mfaEnabled && data.mfaConfigured && (
              <>
                <form
                  method="post"
                  onSubmit={form("mfa-setup", (v) =>
                    setSecret(String(v.secret)),
                  )}
                >
                  <Password />
                  <button className="button" disabled={busy}>
                    Pripraviť autentifikátor
                  </button>
                </form>
                {secret && (
                  <form
                    method="post"
                    onSubmit={form("mfa-enable", (v) => {
                      setSecret("");
                      setCodes(v.recoveryCodes as string[]);
                    })}
                  >
                    <p>
                      Zadajte tento kľúč ručne do autentifikátora (TOTP, SHA1, 6
                      číslic, 30 sekúnd):
                    </p>
                    <code style={{ overflowWrap: "anywhere" }}>{secret}</code>
                    <Password />
                    <Factor required />
                    <button className="button" disabled={busy}>
                      Potvrdiť MFA
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
          <section className="editor">
            <h2>Aktívne relácie</h2>
            {data.sessions.map((s) => (
              <div className="session-row" key={s.id}>
                <p>
                  {s.current ? "Táto relácia" : "Ďalšia relácia"} ·{" "}
                  {new Date(s.createdAt).toLocaleString("sk-SK")}
                </p>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (await post("revoke-session", { id: s.id })) {
                      if (s.current) router.refresh();
                      else await load();
                    }
                  }}
                >
                  Ukončiť reláciu
                </button>
              </div>
            ))}
          </section>
          {can(role, "users", "update") && (
            <section className="editor">
              <h2>Pozvanie a obnova prístupu</h2>
              <p>
                Email nie je nakonfigurovaný. Jednorazový token odovzdajte
                overenému pracovníkovi bezpečným kanálom; heslá neposielajte.
                Príjemca otvorí /account/activate.
              </p>
              <form
                method="post"
                onSubmit={form("issue-token", (v) =>
                  setIssued(`${v.token}\nPlatnosť: ${v.expiresAt}`),
                )}
              >
                <label>
                  Pracovník
                  <select name="userId" required>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.active ? "aktívny" : "neaktívny"})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Účel
                  <select name="kind">
                    <option value="INVITE">
                      Pozvanie neaktívneho pracovníka (24h)
                    </option>
                    <option value="RESET">
                      Reset hesla aktívneho pracovníka (1h)
                    </option>
                  </select>
                </label>
                <Password />
                <Factor />
                <button className="button" disabled={busy}>
                  Vytvoriť jednorazový token
                </button>
              </form>
              {issued && (
                <pre
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {issued}
                </pre>
              )}
              <form method="post" onSubmit={form("revoke-session")}>
                <h3>Odhlásiť pracovníka zo všetkých zariadení</h3>
                <input type="hidden" name="id" value="all" />
                <label>
                  Pracovník
                  <select name="userId">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={busy}>
                  Ukončiť všetky relácie pracovníka
                </button>
              </form>
            </section>
          )}
          <section className="editor">
            <h2>História prihlásení</h2>
            <p>
              {can(role, "users", "read")
                ? "Posledných 50 udalostí tímu"
                : "Vašich posledných 50 udalostí"}
            </p>
            {data.events.map((e) => (
              <p key={e.id}>
                {new Date(e.createdAt).toLocaleString("sk-SK")} ·{" "}
                {e.success ? "Úspech" : "Odmietnuté"} · {e.reason} · {e.userId}
              </p>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
function Password() {
  return (
    <label>
      Aktuálne heslo
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        required
      />
    </label>
  );
}
function Factor({ required = false }: { required?: boolean }) {
  return (
    <label>
      Kód MFA alebo obnovovací kód
      <input
        name="code"
        type="text"
        autoComplete="one-time-code"
        maxLength={100}
        required={required}
      />
    </label>
  );
}
export function ActivateAccount() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Aktivácia / obnova účtu</h1>
        <p>
          Token zadávajte iba na overenej doméne agentúry. Nezadávajte ho do
          adresy stránky.
        </p>
        {done ? (
          <p role="status">
            Heslo bolo nastavené. <Link href="/admin">Prihlásiť sa</Link>
          </p>
        ) : (
          <form
            method="post"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const r = await fetch("/api/identity/redeem", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    Object.fromEntries(new FormData(e.currentTarget)),
                  ),
                });
                const value = await r.json();
                if (!r.ok) throw new Error(value.error);
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Operácia zlyhala.");
              }
            }}
          >
            <label>
              Jednorazový token
              <input name="token" required autoComplete="off" maxLength={100} />
            </label>
            <label>
              Nové heslo
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
              />
            </label>
            <Factor />
            <button className="button">Nastaviť heslo</button>
          </form>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
