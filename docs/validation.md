> Historical baseline runbook. Current Platform 2.0 status: [feature matrix](FEATURE_MATRIX.md), [test report](TEST_REPORT.md), [deployment gates](DEPLOYMENT.md). Backup/restore and full CRM 2.0 are not implemented.

# Verification evidence

Validated in the managed development environment with Node.js 24, PostgreSQL 17, Prisma 7.10.1, Next.js 16.4.3 and system Chromium.

| Check                                                                                            | Result                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `npm run lint`                                                                                   | Passed, ESLint 10 + Next/TypeScript/React Hooks rules   |
| `npm run typecheck`                                                                              | Passed                                                  |
| `npm test`                                                                                       | 17 passed across 2 files                                |
| `PLAYWRIGHT_START_SERVER=true PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` | 10 passed                                               |
| `npm run build`                                                                                  | Production build passed                                 |
| `npm run format:check`                                                                           | Passed                                                  |
| `npm audit --audit-level=low`                                                                    | 0 known vulnerabilities at verification time            |
| `npm run db:migrate` repeated                                                                    | Existing migration recognized; no duplicate application |
| `npm run db:seed` repeated                                                                       | 12 demo properties, 3 agents, 3 articles; no duplicates |
| Docker image build                                                                               | Passed using lockfile, TLS and CA mount                 |
| Container runtime                                                                                | Unprivileged UID 1000, real PostgreSQL connection       |
| Container public pages                                                                           | All registered SK/UK/EN public routes return HTTP 200   |
| Container release job                                                                            | Idempotent migration command passed from image          |

Integration/browser checks exercise public locale metadata and 404, anonymous/cross-origin rejection, property draft/create/publish visibility, agent ownership boundaries, manager restrictions, persisted inquiry consent and agent assignment, status/notes, image rejection/upload/delivery/audit, logout/session revocation, desktop/mobile favorites and consent, actual staff login/editor/create/delete, keyboard gallery dismissal and map opt-in. The private test ingress uses unique loopback IPs to isolate rate-limit buckets between runs; a unit test verifies forged forwarding headers are ignored by default.

Screenshots are from the local production build running against the clean demo seed, after integration fixtures were removed:

- [Slovak desktop home](screenshots/home-sk-desktop.png)
- [Ukrainian mobile home](screenshots/home-uk-mobile.png)

CI configuration is committed but a hosted GitHub Actions run has not been observed. No hosted production environment, DNS/SSL configuration, external CRM, mail delivery or restore drill was validated. Those are separate release/owner prerequisites documented in deployment.md.
