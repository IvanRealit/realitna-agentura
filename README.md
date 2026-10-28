# DOMOV — real estate platform for Slovakia

Next.js App Router · TypeScript · Tailwind CSS · PostgreSQL · Prisma. Public SK/UK/EN website, staff workspace, CRM and content publishing. The provisional brand is editable in **Admin → Nastavenia**. No production deployment has been performed.

## Run locally

Requires Node.js 24 LTS, npm and PostgreSQL 17 (Docker is optional).

```sh
cp .env.example .env
# Edit POSTGRES_PASSWORD and DATABASE_URL together for your local database.
docker compose up -d db
npm ci --ignore-scripts
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/sk` (also `/uk`, `/en`). Staff login: `http://localhost:3000/admin`. Production mode: `npm run build && npm start`. HTTP is for local development only.

For an existing PostgreSQL server, skip Docker and set `DATABASE_URL`. Use a dedicated database for tests; the integration suite creates and removes its own records, but it must **never run against production**.

### First administrator

Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters **in your local `.env` or secure environment settings**, then run `npm run db:seed`. Seed never overwrites an existing user's password. Remove these bootstrap variables after creating the account. There is no public registration or default password. Demo agents have random, undisclosed passwords and `.invalid` contact addresses.

Admin can create/deactivate users, change roles and reset passwords in the workspace. A reset revokes that user's sessions. Self-demotion/deactivation is blocked. Agents can create their own drafts and edit owned records, but cannot publish, change DEMO/featured flags, assign another agent or delete properties. Managers manage properties, content and assigned leads; only Admin manages users, settings, the audit log and lead deletion.

## Implemented workflow

- Localized home, catalog/detail, sale, rent, new builds, commercial, about, team, services, valuation, journal/article, contact, privacy, cookies, terms, favorites, city/region pages and 404.
- Catalog: city/region/type/transaction/condition/price/area/room filters, stable sorting, nine results per page, URL state, list/map switch and local favorites.
- Property: responsive gallery, specs, status, assigned agent, viewing form, related listings, optional HTTPS video/tour/PDF/floor-plan links. External maps load only after explicit action.
- Staff: role-protected property CRUD and publication, image upload/reordering, team/roles, lead status/assignment/notes, multilingual pages/articles/SEO, brand settings and audit log. New lead counts refresh every 30 seconds.
- CRM: inquiry persistence with consent timestamp/version, honeypot and database-backed limits. `src/lib/crm.ts` defines the future REALVIA/backOFFICE adapter boundary; **no external CRM endpoint or integration is implemented**.
- SEO: server metadata, canonical, hreflang, Open Graph, sitemap, robots, WebSite/listing/article JSON-LD. DEMO listings and filtered result URLs are noindex; DEMO listings are excluded from sitemap and omit offer markup.
- Security: bcrypt password hashes, random server-side sessions with hashed tokens, HttpOnly/SameSite cookies, exact Origin checks, server authorization/ownership, Zod validation, bounded streamed request bodies, shared PostgreSQL rate limits, image signature checks and decode/re-encode without EXIF.

All 12 seeded properties, 3 fictional agents and 3 articles are demonstrative. Coordinates identify city centers, **not real property locations**. The bundled AI-generated interior and crops are illustrative; repeated imagery is deliberate demo data, not evidence of actual properties.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
# With the production server running:
npx playwright install chromium
npm run test:e2e
# Or let the suite start the already-built server:
PLAYWRIGHT_START_SERVER=true npm run test:e2e
# In this cloud image only, use its installed Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

The suite tests real HTTP + PostgreSQL: anonymous/cross-origin rejection, role/ownership boundaries, draft visibility, publication, translation fallback, lead validation/assignment, uploads and session revocation. Chromium covers desktop/mobile browsing, favorites and consent. Reports/screenshots are generated under `playwright-report/` and `test-results/` and are ignored by Git. CI runs the same checks against a fresh PostgreSQL service. When Playwright starts its private server, it acts as trusted ingress with unique test IPs, keeping repeated tests out of the shared development rate-limit bucket. Do not expose that test server publicly.

## Configuration and deployment

See [deployment runbook](docs/deployment.md), [architecture](docs/architecture.md), [design system](docs/design-system.md) and [known limits](docs/limitations.md). Environment variables are documented in `.env.example`. Never commit `.env` or real personal data.

The stable Prisma JS compiler and official `pg` adapter avoid native query-engine downloads. `db:generate` invokes the pinned official Prisma generator through `@prisma/internals`; these versions must be upgraded together. `db:migrate` applies checked-in PostgreSQL SQL in transactions with advisory locking and SHA-256 verification, writing the Prisma-compatible migration ledger. It needs no external binary server. Use this runner consistently; it intentionally supports **transactional PostgreSQL SQL migrations**, not non-transactional operations such as `CREATE INDEX CONCURRENTLY`. Review every migration before production. Standard Prisma tooling is optional and may require network access to `binaries.prisma.sh`.

Legal pages are explicitly **drafts requiring Slovak legal review**. No analytics provider, email delivery service, real business identity or third-party CRM is connected. The environment is suitable for development and staging; production release requires the owner actions in the runbook and explicit approval.
