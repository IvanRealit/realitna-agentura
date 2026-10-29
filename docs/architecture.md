> Historical baseline runbook. Current Platform 2.0 status: [feature matrix](FEATURE_MATRIX.md), [test report](TEST_REPORT.md), [deployment gates](DEPLOYMENT.md). Backup/restore and full CRM 2.0 are not implemented.

# Architecture

## Boundaries

`src/app/[locale]/[[...path]]` is the server-rendered public site. A centralized route registry maps semantic page keys to Slovak, Ukrainian and English paths. Unknown locales/routes return 404. Dictionaries contain UI labels; JSON content uses a locale-keyed `{ title, description }` shape with Slovak fallback. Add a locale to the registry/type, dictionaries, labels and content editors together, then run route tests.

`src/app/admin` is the staff workspace. Its server entry checks the session and role before rendering the client editor. Admin UI labels currently use Slovak. API authorization is independent of UI visibility.

`src/app/api/admin` validates every operation and enforces ownership. Writes and their audit records share a database transaction. API schemas explicitly select permitted fields, preventing client-side mass assignment. Agents cannot escalate publication or reassign leads. `api/leads` is public, validated and rate-limited. No client receives password hashes or session tokens in JSON.

`src/lib` owns database access, localization, schemas, catalog queries, session security, site metadata and the future CRM port. Prisma's schema is the data contract. PostgreSQL is required at runtime; there is no misleading in-memory production fallback.

## Authentication and data flow

Login → rate-limit IP/shared bucket and account bucket → constant-cost bcrypt comparison → random 256-bit token → only SHA-256 token hash in Session → HttpOnly cookie, eight-hour expiry. Logout deletes the database session. Deactivated users and expired sessions are rejected on every request. Password/role updates revoke user sessions.

The application does not trust `X-Forwarded-For` by default. In development all traffic shares one rate-limit bucket. Enable `TRUST_PROXY=true` only if the trusted ingress **replaces** that header and direct access to Node is blocked. Limits are shared across workers using an atomic PostgreSQL upsert.

Property submission → Zod schema → role/ownership and agent checks → transactional write + audit → server-rendered public pages fetch current published state. Draft/Archived never appear publicly. Reserved/Sold/Rented remain visible with a status label. Public metadata marks DEMO listings noindex.

Inquiry → explicit consent, server timestamp and policy version → assigned property agent → staff NEW badge → IN_PROGRESS / CLOSED with internal notes. There is no automatic email or CRM export. Before integrating either provider, add a durable outbox, delivery retries, idempotency, signed webhooks where documented, and data-processing review.

## Media

Image uploads require a valid staff session and same-origin request. Requests are bounded to 10 MB; files to 8 MB. JPEG/PNG/WebP signatures are checked and Sharp decodes at most 40 million pixels, removes metadata and writes a new WebP with a random UUID. SVG/HTML and PDF uploads are rejected. PDF, video, floor-plan and virtual-tour documents can be linked over HTTPS. No server-side arbitrary URL fetching is performed by upload endpoints.

Files are served by the `/uploads/[name]` route with an exact UUID filename pattern and immutable cache policy. A persistent `UPLOAD_DIR` is required. Removing an image from a property removes its association, not its stored file. A future garbage collector must account for shared references and retention before deleting orphan media. For a scalable/multi-instance deployment replace the local store with a tested object-storage adapter.

## Operations

The SQL migration runner holds a PostgreSQL advisory lock, verifies previously applied migration checksums and runs each new migration and ledger insert in one transaction. A failed migration rolls back. Applied migration files must never be edited; add a new directory. Database migrations are a release job, not a per-request task.

Run `npm run data:purge` daily. It deletes leads older than the configured retention period (all statuses), expired sessions/rate-limit rows and audit records older than a year. This policy is a draft: obtain legal review, handle legal holds separately and align backup expiry. Test on staging before scheduling against live data.

`/api/health` checks a real database query without exposing database details. No production personal data or credentials belong in logs, snapshots, test artifacts or Git. CI uses ephemeral test accounts, whose passwords are random per run.
