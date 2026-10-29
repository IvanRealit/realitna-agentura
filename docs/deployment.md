> Historical baseline runbook. Current Platform 2.0 status: [feature matrix](FEATURE_MATRIX.md), [test report](TEST_REPORT.md), [deployment gates](DEPLOYMENT.md). Backup/restore and full CRM 2.0 are not implemented.

# Deployment runbook — owner approval required

No production site, DNS record or cloud database has been created by this implementation.

## Choose hosting and provision

Use a Node.js 24 LTS host/container with managed PostgreSQL 17, connection pooling and a **persistent writable media volume**. The current upload adapter targets a single application instance. Vercel or other ephemeral/serverless filesystems require an object-storage adapter before image uploads can be considered production-ready; do not rely on `/tmp` or the deployment filesystem for permanent images.

Create separate development, staging and production databases and storage. Use a dedicated least-privilege application database user. Apply migrations with a release user where your database policy requires elevated DDL permissions. Require verified TLS for remote PostgreSQL and configure the provider CA rather than disabling certificate verification. Never use the example local database password on a public server.

### Environment

- `DATABASE_URL`: server-side PostgreSQL connection string (secret).
- `SITE_URL`: exact public HTTPS origin, e.g. `https://your-owned-domain.sk`; canonical URLs, sitemap and write-origin checks depend on it. Do not append a path.
- `COOKIE_SECURE=true`: mandatory on public HTTPS deployments. Local HTTP may use false.
- `TRUST_PROXY=true`: only with an ingress that replaces `X-Forwarded-For` and prevents direct access. Otherwise leave false.
- `UPLOAD_DIR`: persistent directory accessible to the unprivileged application user, outside the immutable bundle; use `/app/data/uploads` in Docker.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`: one-time initial owner; enter securely, run db:bootstrap once, remove. Never bake into an image.
- `NEXT_TELEMETRY_DISABLED=1`: disables Next.js build telemetry.
- `POSTGRES_PASSWORD`: only for local Compose database provisioning.

## Release sequence

1. Run CI against a fresh test database. Review the migration SQL, role boundaries, legal text and asset rights.
2. Back up the live database and confirm the last restore drill succeeded.
3. Build `npm ci --ignore-scripts && npm run build`. The build does not require a database connection; requests do.
4. Apply `npm run db:migrate` once against the target database. The runner uses a lock, hashes and transactions and can safely be rerun. Do not edit applied migration files or mix unreviewed migration runners.
5. For a new **staging** environment, run `npm run db:seed`. For production, bootstrap the first owner with `npm run db:bootstrap` (no demo content), then **archive/delete all DEMO listings and remove demo team/blog content** before public release. The shipped seed always includes demo content; it is not a production content import.
6. Start `npm start`, verify `/api/health`, login/logout, one real authorized property workflow, a test inquiry and image persistence after a restart.
7. Place behind the trusted HTTPS ingress, set request-body limits to at most 10 MB, establish timeouts and security headers. Add HSTS only after HTTPS works for all required subdomains. The app sets CSP, anti-framing, nosniff, referrer and permissions headers; adapt CSP deliberately for any future providers. Do not disable it globally.
8. With the owner's explicit approval, point DNS and release. Nothing in this repository automatically publishes production.

### Container

```sh
docker build -t realitna-agentura .
# Managed cloud environment with a proxy CA:
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t realitna-agentura .
# Supply production values through the host secret manager, never build args:
docker run --rm --env-file /secure/runtime.env realitna-agentura npm run db:migrate
docker run -d --name realitna-web --env-file /secure/runtime.env \
  -p 127.0.0.1:3000:3000 -v realitna-uploads:/app/data/uploads realitna-agentura
```

The Docker image runs as `node`, not root. Migration/seed CLI dependencies are retained so release jobs can use the same image; this trades image size for a reproducible operational toolchain. Keep the `DATABASE_URL` reachable from the container (localhost refers to that container, not your host).

## DNS, SSL and observability

Use the hosting provider's required A/AAAA or CNAME records for an owned domain, configure one canonical www/apex variant and redirect the other permanently. Wait for validation and issue managed TLS certificates with automatic renewal. Confirm TLS, redirects, canonical and hreflang use the same origin. Review SPF/DKIM/DMARC only when an actual email provider is integrated; forms currently save to CRM and do not send mail.

Monitor HTTP error rate, latency, database connectivity, storage/disk usage and failed logins. Logs must redact inquiry content and credentials. Restrict database and backup access. Rate limits require the shared PostgreSQL store. Staff use named accounts and least-privilege roles; configure MFA_ENCRYPTION_KEY and enroll administrators before real customer data.

## Backups and privacy operations

Enable managed daily backups and point-in-time recovery with encrypted off-site retention. Back up the media volume too. Perform a restore test to an isolated database and media directory at least monthly and before risky migrations. A Git rollback does not undo a database migration; use compatible forward changes and a reviewed recovery plan.

Schedule `npm run data:purge` daily. It removes old leads according to Settings.retentionDays, regardless of status. Before production a lawyer must confirm lawful bases, retention, legal holds, processor agreements, international transfers and backup expiration. Provide a documented identity-verified process for access/deletion requests. Deleting live rows does not immediately erase retained backups.

## Integrations and analytics

REALVIA/backOFFICE integration needs official documentation, sandbox access, credentials, mappings and contractual review. No endpoints are guessed. Email delivery and analytics are not configured. Optional analytics consent is recorded locally, but no network analytics script is loaded even after opt-in. When implementing a provider, initialize only after a current affirmative consent and stop it on withdrawal; update CSP, provider disclosure and tests.
