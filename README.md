# DOMOV — real estate platform for Slovakia

Next.js App Router · TypeScript · Tailwind CSS · PostgreSQL · Prisma. Public SK/UK/EN website, staff workspace, persisted inquiries, branches and content publishing. Full Clients/Deals CRM is the next stage. The provisional brand is editable in **Admin → Nastavenia**. No production deployment has been performed.

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

Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters **in your local `.env` or secure environment settings**, then run `npm run db:bootstrap`. This creates the first Super Admin without DEMO content and refuses to overwrite existing accounts. For an existing legacy ADMIN only, use `npm run db:bootstrap -- --promote-existing` with that account’s current credentials; it promotes the first owner explicitly, revokes sessions and refuses if an owner already exists. Remove these bootstrap variables after creating the account. There is no public registration or default password. `db:seed` now requires explicit APP_ENV=demo or test and never creates an administrator. Demo agents have random, undisclosed passwords and `.invalid` contact addresses.

Seven roles are supported: Super Admin, Admin, Branch Manager, Agent, Coordinator, Accountant and Auditor; legacy MANAGER retains its company-wide scope. Admin can create/deactivate users and assign branches/roles; only Super Admin manages other Super Admin accounts. A reset revokes that user's sessions. Self-demotion/deactivation is blocked. Agents can create their own drafts and edit owned DRAFT/REVIEW records, but cannot publish, change DEMO/featured flags, assign another agent or delete properties. Publish requires REVIEW and the quality gate. Property PATCH/DELETE requires its current version (or quoted If-Match header); stale edits return 409 without overwriting data. Legacy Managers retain their existing company-wide access; Branch Managers are scoped to their branch. Accountants have account security access until Finance is implemented; Auditors cannot change business records. See [permission matrix](docs/security/PERMISSION_MATRIX.md).

## Implemented workflow

- Localized home, catalog/detail, sale, rent, new builds, commercial, about, team, services, valuation, journal/article, contact, privacy, cookies, terms, favorites, city/region pages and 404.
- Catalog: city/region/type/transaction/condition/price/area/room filters, stable sorting, nine results per page, URL state, list/map switch and local favorites.
- Property: responsive gallery, specs, status, assigned agent, viewing form, related listings, optional HTTPS video/tour/PDF/floor-plan links. External maps load only after explicit action.
- Staff: role-protected property CRUD and publication, image upload/reordering, team/roles, lead status/assignment/notes, multilingual pages/articles/SEO, brand settings and audit log. New lead counts refresh every 30 seconds.
- CRM: inquiry persistence with consent timestamp/version, honeypot and database-backed limits. `src/lib/crm.ts` defines the future REALVIA/backOFFICE adapter boundary; **no external CRM endpoint or integration is implemented**.
- SEO: server metadata, canonical, hreflang, Open Graph, sitemap, robots, WebSite/listing/article JSON-LD. DEMO listings and filtered result URLs are noindex; DEMO listings are excluded from sitemap and omit offer markup.
- Security: bcrypt password hashes, random server-side sessions with hashed tokens, HttpOnly/SameSite cookies, exact Origin checks, server authorization/ownership, Zod validation, bounded streamed request bodies, shared PostgreSQL rate limits, image signature checks and decode/re-encode without EXIF.

All 12 seeded properties, 3 fictional agents and 3 articles are demonstrative. Coordinates identify city centers, **not real property locations**. The bundled AI-generated interior and crops are illustrative; repeated imagery is deliberate demo data, not evidence of actual properties.

## Platform 2.0 and architecture

Development continues in this repository as a modular monolith, retaining the public/staff/API boundaries. Read the [audited baseline](docs/audit/EXISTING_SYSTEM.md), [module ownership and architecture](docs/ARCHITECTURE.md), [feature matrix](docs/FEATURE_MATRIX.md), and [staged roadmap](docs/ROADMAP.md). Missing modules are not presented as working CRM features.

## Checks — isolated test database required

```sh
npm run lint
npm run typecheck
npm test
npm run build
# Start only the separate, ephemeral test PostgreSQL service (port 55432):
docker compose -p realitna-test -f infrastructure/docker/compose.test.yml up -d --wait
# Set TEST_DATABASE_URL using .env.example or the process environment.
npm run test:prepare
npm run test:bootstrap
npx playwright install chromium
npm run test:e2e
# In this managed cloud image, use the installed browser:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

`TEST_DATABASE_URL` must name a separate loopback `realitna*_test` database. There is **no fallback** to `DATABASE_URL`; matching application/test targets are rejected even across localhost aliases and different credentials. The runner sets its own port (3101), `.next-test` build, `data/test-uploads`, test environment marker and trusted test ingress. Playwright owns its server and refuses an existing listener. Global setup verifies that the server belongs to this test run and checks the actual database name before fixture writes. Direct `npx playwright test` without the isolation runner is rejected. Never point test configuration at production.

Tests cover real HTTP/PostgreSQL workflows, no-JavaScript native form submission, and existing public/CRM/editor layouts at 320, 360, 375, 390, 430, 768, 1024 and 1440 px. This is not a full WCAG audit or a real iPhone Safari test. Reports under `playwright-report/` and `test-results/` are ignored by Git. Current evidence is in [TEST_REPORT](docs/TEST_REPORT.md). CI provisions a fresh PostgreSQL service and uses the same guarded workflow; a hosted run must be observed before claiming CI is green.

## Configuration and deployment

See [deployment runbook](docs/deployment.md), [architecture](docs/architecture.md), [design system](docs/design-system.md) and [known limits](docs/KNOWN_LIMITATIONS.md). Environment variables are documented in `.env.example`. Never commit `.env` or real personal data.

The stable Prisma JS compiler and official `pg` adapter avoid native query-engine downloads. `db:generate` invokes the pinned official Prisma generator through `@prisma/internals`; these versions must be upgraded together. `db:migrate` applies checked-in PostgreSQL SQL in transactions with advisory locking and SHA-256 verification, writing the Prisma-compatible migration ledger. It needs no external binary server. Use this runner consistently; it intentionally supports **transactional PostgreSQL SQL migrations**, not non-transactional operations such as `CREATE INDEX CONCURRENTLY`. Review every migration before production. Standard Prisma tooling is optional and may require network access to `binaries.prisma.sh`.

Legal pages are explicitly **drafts requiring Slovak legal review**. No analytics provider, email delivery service, real business identity or third-party CRM is connected. The environment is suitable for development and staging; production release requires the owner actions in the runbook and explicit approval.

## Operating guides

[User guide (UK)](docs/USER_GUIDE_UK.md) · [Admin guide (UK)](docs/ADMIN_GUIDE_UK.md) · [Database](docs/DATABASE_SCHEMA.md) · [Permissions](docs/security/PERMISSION_MATRIX.md) · [Backup/restore blocker](docs/BACKUP_RESTORE.md) · [Integrations](docs/INTEGRATIONS.md) · [VPS preparation](docs/deployment/VPS_DEPLOYMENT.md).

Platform 2.0 is staged work. Clients/deals/calendar/private documents/finance/AML and verified off-site backups are not yet implemented; the existing staff workspace is not the full requested CRM.

## Enterprise foundation: account security and branches

- `/admin/branches`: persisted branch CRUD/archive, contact fields, configurable commission basis points, live counts. Archive is blocked with active staff/listings/open leads; no destructive branch deletion. Branch transfer requires active records to be reassigned first.
- `/admin/users`: roles, branch assignment, blocking and password updates revoke sessions/tokens. Existing records remain unassigned to a branch until deliberately assigned; migration does not infer branches from cities.
- `/admin/security`: own profile/password, sessions, login history, optional TOTP enrollment and one-time recovery codes. Admin issues invitation/reset tokens with current-password reauthentication. Email delivery is not configured: use a verified secure channel. Recipient enters the token at `/account/activate`, never in a URL.
- Set `MFA_ENCRYPTION_KEY` to 32 cryptographically random bytes encoded as 64 hex characters in secure runtime environment settings. Never commit or regenerate a configured key casually. Without it enrollment is disabled. Keep an independent secure recovery copy; key rotation is not automated. Enrollment invalidates all sessions and shows recovery codes once. MFA is available but existing administrators are not automatically forced to enroll; complete enrollment before real customer data.
- `npm run test:bootstrap` uses a disposable scratch database created via the guarded local test target. The test DB user needs CREATEDB for this check; application production users must not have that privilege.

Current scope/status and remaining stages: [Stage A handoff](docs/operations/STAGE_A_HANDOFF.md), [identity API](docs/architecture/IDENTITY_API.md), [security review](docs/security/IDENTITY_REVIEW.md).
