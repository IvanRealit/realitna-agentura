# Звіт перевірок платформи 2.0

Сесія: 29.10.2026 (Europe/Bratislava). Не переносимо старі результати як нові. Production не використовується для тестів.

## Аудит baseline main 9dae815

- lint, typecheck, 17 unit: passed.
- PostgreSQL development: доступний, 12 DEMO properties, 3 demo agents, 0 leads, 3 articles.
- HTTP на початку: connection refused; після restart наявної збірки сервер доступний. Живі процеси не пережили відновлення середовища.
- Research URLs: proxy CONNECT 403. GitHub PR API: Forbidden. Жодної перевірки функцій конкурентів/hosted CI через ці джерела не виконано.

## Safety foundation — виконано

| Перевірка                                               | Фактичний результат                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| lint / typecheck                                        | Passed                                                                                                      |
| Unit tests                                              | 33 passed, 3 files                                                                                          |
| Guard без TEST_DATABASE_URL                             | Очікуваний exit 1 **до** будь-яких fixtures                                                                 |
| Guard небезпечних URL / однакових БД / direct execution | Negative unit cases passed                                                                                  |
| Новий тестовий PostgreSQL                               | Окремий tmpfs container, loopback port 55432; development database не використано                           |
| Test build                                              | `.next-test`, passed, відмінний build origin для metadata regression                                        |
| Playwright                                              | 12 passed на тестовій БД та власному сервері 3101                                                           |
| Native form, JavaScript disabled                        | Реальний POST зберіг 1 fixture lead, redirect не містить PII, українські/англійські feedback keys збережено |
| 8 viewport widths                                       | Public home/catalog + staff dashboard/properties/editor: без root horizontal overflow, без JS page errors   |
| Реальний Docker context audit                           | data/private canary, .env, node_modules, .next/.next-test відсутні; безпечний .env.example присутній        |
| robots runtime origin                                   | Sitemap URL використовує runtime origin, а не build-only.invalid                                            |

Матриця ширин перевіряє наявні екрани; це не перевірка майбутніх AML/Finance/Calendar UI, не повний WCAG 2.2 AA і не фізичний iPhone. Browser — system Chromium. Test DB/media/build ізольовані; fixtures очищають лише власні записи.

## Ще не перевірено / не реалізовано

Повна seven-role/branch security matrix; client/deal/calendar/document/finance workflows; MFA; encrypted off-site backup та restore drill; disaster recovery; production upgrade/rollback; OAuth/portal/mail/AI providers; hosted CI status; реальний VPS/TLS/DNS. Деталі в FEATURE_MATRIX та KNOWN_LIMITATIONS. Production readiness не підтверджено.

## Property/access/mobile increment — фінальний прогін

- Lint, TypeScript strict: passed; 48 unit tests у 4 файлах passed.
- Normal production-mode build: passed. Test build `.next-test`: passed.
- Playwright: **14/14 passed**, 28.6 s, isolated PostgreSQL realitna_test + Chromium. Перевірено server-side ownership, review/quality gates, browser editor Draft→Review→Published→Delete, реальне image upload/read, lead persistence/assignment, native login/logout і lead без JS.
- Concurrent HTTP PATCH: рівно один 200 та один 409, version +1, рівно один audit запис; stale DELETE не видаляє рядок; PATCH без version повертає 428.
- Mobile: 320/360/375/390/430/768/1024/1440; home/catalog/dashboard/properties/editor без root overflow і JS errors; нижня навігація та 16px input перевірені.
- `npm audit --audit-level=high`: found 0 vulnerabilities (стан registry на час перевірки, не гарантія відсутності всіх вразливостей).
- Additive migration preservation: 12 існуючих test rows та 12 local development DEMO rows збережені, version initialized. Немає destructive migration.
- Local runtime після normal build/migration: `/api/health` 200 status ok, `/uk` 200, `/admin` 200; loopback only port 3000.

Перші browser прогони виявили помилку exact-name селектора select та shared fixture після worker restart; виправлено role-based selector і незалежний concurrency fixture. Missing-version case відокремлено від invalid publication transition. Фінальний повний прогін успішний, assertions не вимикались. Shell sandbox не дозволяв local socket/server/audit network, повторено через дозволене environment execution.

Hosted CI, повний Docker image rebuild цієї фази, реальний iOS, encrypted backup/restore, full VPS та production не перевірені. Docker context canary — окрема перевірка виключення даних, не full-image runtime test.

## Завдання №2 — етап A (29.10.2026)

Baseline: main fc6ce9f (merged PR #3), clean tree, lint/typecheck/48 unit passed before edits.

- 62 unit tests / 5 files passed: existing domain/security/isolation, seven-role/scopes, bcrypt 72-byte boundary, RFC6238 SHA1 vectors, encrypted secret tampering/wrong-key rejection.
- Full browser/HTTP/PostgreSQL suite: **20/20 passed** (~1 min), isolated realitna_test DB/build/server/media. Includes branches/direct-ID/query filters/assignment, role escalation denial, blocked account/session revocation, one-use invite/reset concurrent redemption, expired/superseded tokens, own password changes, MFA enrollment/replay/recovery/reset protection, real branch/profile browser saves, mobile widths plus all 14 prior regressions.
- `test:bootstrap`: passed on newly created disposable scratch DB: migrate, first owner without DEMO, repeat refusal/no password overwrite, production seed refusal, wrong-password legacy promotion refusal and explicit authenticated promotion success. Scratch DB dropped after check, not production.
- Lint/typecheck/format check passed; test and normal builds passed. npm audit reports 0 known vulnerabilities at check time.
- Local additive migration preservation: User/Property/Lead/Content/Settings old columns unchanged; 12 DEMO property/3 fake users retained. Migration 202610290002_enterprise_identity applied only known loopback development/test targets.

Первинна bootstrap integration перевірка справді впала: `$queryRaw` не десеріалізував void result advisory lock. Замінено на `$executeRaw`, повторний тест успішний. Помилки не приховано та assertions не вимкнено. Final test statuses не включають expected-failure cases як провали.

Hosted CI/GitHub PR API, фізичний iPhone/Safari, full production Docker stack/VPS/TLS, real encrypted backup і restore **не перевірені**. Клієнти/угоди/календар/фінанси/документи ще не створені, їхні acceptance tests не запускалися. MFA потребує runtime key і добровільного enrollment; mandatory rollout/recovery policy ще не завершено.

Після останніх змін стилів Branch/Security та dedicated-module 404 guard повторено test build і всі 6 enterprise scenarios: **6 passed**, 28.7 s. Попередній повний 20/20 прогін залишається regression evidence; жодних tests skip/disable не додано.

Final local smoke after latest normal build: `/api/health` 200 status ok, `/uk` 200, `/admin` 200, `/account/activate` 200; anonymous `/api/identity/security` 401. Сервер слухає лише 127.0.0.1:3000, публікації немає.
