# Roadmap 2.0 — перевірені інкременти

Правило: кожна фаза має завершений вертикальний зріз, тести, commit/PR і оновлену feature matrix. Повний master task не вкладається в одну чесну сесію. Нереалізовані модулі не показуємо як працюючі екрани.

| Етап                         | Результат                                                                                                               | Gate                                                                  | Стан                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| 1 Аудит і архітектура        | inventory, risks, competitor access evidence, module owners, dependency graph                                           | baseline lint/types/17 units + DB/read-only runtime audit             | Документація створена; hosted PR API blocked  |
| 2 Безпечний фундамент        | isolated test DB/port/media/build, no data in image, native form POST, central legacy policy, versioned property review | fresh DB migrations, regressions, concurrent write conflict, 8 widths | У роботі цієї сесії                           |
| 3 CRM і бізнес-процеси       | Branch + seven roles, Client/needs/merge/consent, Deal/stages/tasks, lead idempotency                                   | scope/PII tests, client→deal flow, safe migration                     | Не розпочато                                  |
| 4 Сайт і CMS                 | compare, multi-marker search, profiles/branches, FAQ/reviews, banners/menu/theme                                        | SEO/no-JS/mobile/accessibility checks                                 | Existing site preserved; new features planned |
| 5 Calendar/documents/finance | conflict-safe booking, private docs/templates, tested commissions/invoices                                              | booking race, file ACL, financial formulas                            | Не розпочато                                  |
| 6 Mobile/PWA                 | bottom nav, 8 widths, camera, safe non-PII offline drafts, conflicts                                                    | mobile E2E + real iOS check, no PII cache                             | Не розпочато; regression matrix starts in 2   |
| 7 Backup/security/recovery   | encrypted consistent sets + S3, jobs/admin status, isolated restore; MFA                                                | measured restore, checksum/corruption tests, security review          | **Production release blocker**                |
| 8 Integrations/optional AI   | documented provider adapters, OAuth, outbox/retries, human approval                                                     | official sandbox tests with configured credentials                    | External prerequisites missing                |
| 9 Quality/reporting          | actual scoped analytics/export, full critical scenario suite, demo 20/5/30/15/10                                        | all acceptance scenarios executed on test DB, hosted CI               | Не розпочато                                  |
| 10 VPS/release               | loopback staging, reverse proxy/TLS, monitoring, safe update/rollback                                                   | backup before update, protected production approval, smoke            | Не розпочато; no production authorization     |

## Порядок найближчих PR

1. Audit/architecture/research + safety findings (цей baseline).
2. Test isolation + Docker context/privacy fixes + progressive forms.
3. Property module service, explicit manager review, optimistic versions; backward-compatible route paths.
4. Branch/role migration and permission matrix: fail-closed branch manager, own-agent, assistant, accountant and auditor scopes.
5. Clients CRUD/search/preferences/consent; lead linking and dedup. Потім configurable Deal pipeline.
6. Parallelizable domains після стійких access/client/deal contracts: appointments, documents and finance. Parallel work можливе лише з чіткими owners і integration tests.

## Owner / зовнішні рішення

- Дозволені research/GitHub API домени в environment settings (draft збережено); це не дозвіл на production.
- Реальні бренд, контакти, договори, фото й правові підстави для даних.
- Спеціаліст перевіряє AML/GDPR/retention та бухгалтер — DPH/commission rules.
- Для backup: S3-compatible endpoint/bucket, encryption/key custody, immutable retention, recovery approvers. Не передавати секрети в чат.
- OAuth/portal/email/AI providers потребують офіційної документації, договорів та ключів; не блокують незалежні локальні модулі.
