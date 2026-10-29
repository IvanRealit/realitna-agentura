# Feature matrix — джерело стану реалізації

Стани: **є** — перевірений поточний код; **частково** — явно обмежений workflow; **план** — не реалізовано; **blocked** — потрібні зовнішні налаштування/документація. Повністю готовою платформу 2.0 не називаємо. Baseline `9dae815`; актуальні перевірки — TEST_REPORT.

| Модуль / можливості                                                 | Поточний стан                               | Цільовий етап           | Залежності / release gate                      |
| ------------------------------------------------------------------- | ------------------------------------------- | ----------------------- | ---------------------------------------------- |
| SK/UK/EN сайт, SSR, home/catalog/detail/categories                  | є                                           | 4                       | regression tests                               |
| URL-фільтри, pagination, сортування                                 | є                                           | 4                       | public DTO/search                              |
| Карта multi-marker, порівняння, saved searches                      | частково: opt-in single map, favorites only | 4                       | mapping provider, no-JS behavior               |
| Agent profiles, branches, FAQ/reviews/news                          | частково: team/blog, решти немає            | 4                       | agents/branch schemas, verified content        |
| CMS текст/SEO/brand/contact                                         | частково                                    | 4                       | banners/menu/logo/theme schemas                |
| Native POST без JS                                                  | є: native lead/login/logout POST            | 2                       | privacy-safe intake                            |
| Property CRUD/locale/media/statuses                                 | частково                                    | 2–3                     | review/version/history                         |
| Manager review, quality checks, concurrency                         | є: REVIEW/version/atomic audit              | 2                       | migration + ownership tests                    |
| Owner/branch/cadastre/floor/energy/currency/contracts               | план                                        | 3                       | clients/branches, private DTO                  |
| Price history/revisions/comments/duplicate/bulk                     | план                                        | 3                       | event/revision model, versions                 |
| CSV/XLSX/XML/PDF imports/exports, A4/A5, watermark                  | план                                        | 3–5                     | mapping/preview/jobs/renderer                  |
| Client person/company/multiple roles/contact history                | план                                        | 3                       | seven-role/branch policy                       |
| Needs/matching, inverse matching, duplicate merge                   | план                                        | 3                       | normalized clients/inventory                   |
| Tags/segments/reminders/GDPR export/anonymize                       | план                                        | 3                       | legal holds, access audit                      |
| Lead intake/assignment/notes/NEW-IN_PROGRESS-CLOSED                 | є, обмежено                                 | 3                       | clients/deals/dedup                            |
| Configurable sales stages/Kanban/value/probability/loss             | план                                        | 3                       | Deal, Stage, stage events                      |
| Tasks/deadlines/unanswered reminders/conversion                     | план                                        | 3–5                     | calendar/outbox/history                        |
| Legacy ADMIN/MANAGER/AGENT, secure sessions                         | є                                           | 2/7                     | central policy + MFA                           |
| Super Admin/Admin/Branch Manager/Agent/Assistant/Accountant/Auditor | план                                        | 3                       | branch migration + full scope tests            |
| Branches/KPI/commissions/onboarding/internal board                  | план                                        | 3/5                     | deals, agents, finance                         |
| Reassignment on departure/temporary blocks/login log                | частково: active flag/session revoke        | 3/7                     | scope-safe reassignment transaction            |
| Calendar/viewings/conflict prevention/recurrent tasks               | план                                        | 5                       | DB constraint/locks, timezone                  |
| Google Calendar / email reminders                                   | blocked                                     | 8                       | OAuth/mail provider credentials, official docs |
| Documents/private upload/PDF preview/version/search                 | план                                        | 5                       | separate private storage/access audit          |
| DOCX/PDF templates/generation/signing registry                      | план                                        | 5                       | legal drafts, render isolation                 |
| Google Drive OAuth/folder selection                                 | blocked                                     | 8                       | scopes/keys/processor review                   |
| AML/KYC questionnaires/risk/status/documents/review                 | план                                        | 5/7                     | human policy, sensitive ACL, retention         |
| Consent/retention/data export/anonymization/legal holds             | частково: inquiry consent + purge           | 3/7                     | specialist review, backup retention            |
| Agency/agent/branch/partner commission and profit                   | план                                        | 5                       | integer/decimal math and formula tests         |
| Invoices/PDF/numbering/DPH/payment/QR/accountant export             | план                                        | 5                       | accountant approval, transaction numbering     |
| Portal adapters/feeds/mapping/jobs/retry/status                     | blocked/план                                | 8                       | official contracts/docs; no invented endpoints |
| Social drafts/assets/QR/UTM/campaign/co-broke                       | план                                        | 8                       | consent, approved public DTO                   |
| Optional AI descriptions/translations/drafts/summaries              | blocked/план                                | 8                       | key opt-in, PII policy, human approval         |
| Mobile 8 widths/CRM bottom nav/camera/quick actions                 | частково: only 390 historically tested      | 6 (regression starts 2) | real browser flows, iPhone device tests        |
| PWA/installability/safe offline drafts/conflict sync                | план                                        | 6                       | no confidential offline cache by default       |
| Encrypted DB+media+private documents/config backup                  | план — production blocker                   | 7                       | consistent set + immutable off-site target     |
| Daily/weekly/monthly retention/S3/checksums/error alerts            | план                                        | 7                       | scheduling, encryption, S3 credentials         |
| Backup admin status/manual run/pre-update backup                    | план                                        | 7                       | privileged job, audit, locking                 |
| Isolated restore drill/RPO/RTO/3-2-1/destructive confirmation       | план                                        | 7                       | recovery tests and operator confirmation       |
| Origin checks/SQL params/input bounds/secure sessions               | є                                           | 2/7                     | security regression tests                      |
| MFA/TOTP/key rotation/secret custody                                | план                                        | 7                       | recovery flow, encrypted secret material       |
| Staff dashboard/search/saved filters/bulk/error UI                  | частково: basic tabs/counts                 | 3–6                     | module registry, scoped search                 |
| Real analytics: funnel, deals, fees, branches, sources              | частково: 3 DB counts                       | 5/9                     | domain events, scope/date filters              |
| Portable PDF/XLSX/CSV reports                                       | план                                        | 5/9                     | report model, export permissions               |
| Mortgage/commission calculators                                     | план                                        | 5/19 roadmap            | configurable assumptions, tested rounding      |
| Contract expiry/seller funnel/referrals/checklists                  | план                                        | 3/5                     | tasks, agreements, notifications               |
| Developer project/building/floor/unit/reservation                   | план                                        | after core              | inventory extension + reservation locks        |
| Knowledge base/agent onboarding/email templates                     | план                                        | after core              | content/workflow modules                       |
| One VPS app/DB/storage/proxy/HTTPS/restart/monitoring               | частково: image + DB compose                | 10                      | backups, TLS, staging smoke                    |
| Isolated local staging without paid services                        | план                                        | 2/10                    | separate volumes/ports; loopback only          |
| CI lint/types/unit/integration/E2E/build/audit                      | є workflow; hosted status unavailable       | 1/9                     | GitHub API/network access                      |
| Dedicated test DB / build / media fail-closed                       | є: fail-closed isolated runner              | 2                       | guard + isolated PostgreSQL                    |
| Feature branch→PR→review→staging→prod approval                      | частково: baseline merged PR #2             | every stage             | API access, protected environment              |
| Production release backup/rollback/restore validation               | план                                        | 7/10                    | owner approval + verified backup               |
| Demo 20 properties/5 agents/30 clients/15 leads/10 deals            | частково: 12/3/0/0/0                        | after CRM               | separate demo mode + safe scoped clear         |
| Full documentation and operating guides                             | старт у цій сесії                           | all                     | keep actual evidence/current limitations       |

Окремі adapters або документація не вважаються працюючою інтеграцією. Scheduled backup, HTTPS та hosted CI не позначаються «є» лише через наявність YAML. Зміни стану виконуються після реальних перевірок.

## Перевірений інкремент цієї сесії

Central legacy policy винесено у modules/access; property writes — modules/properties. Є REVIEW, базовий publication quality gate, version/If-Match conflicts, atomic audit price/status/version metadata. Залишаються тільки три legacy ролі; це не branch scoping. Нижня CRM navigation та 16px mobile controls додані, 8-width regression виконано; real iOS/PWA/offline ще не перевірені. Native lead/login/logout більше не надсилають приватні поля через GET.

## Завдання №2 — перевірений етап A

| Можливість                                              | Поточний стан | Межі                                                                                |
| ------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| Seven roles + legacy MANAGER                            | є             | Accountant поки тільки account security; Finance відсутній                          |
| Branch CRUD/archive/contact/commission settings/counts  | є             | немає Deals guard до появи Deal; немає public branch pages                          |
| User create/edit/block/roles/branch/session revocation  | є             | transfer active inventory потребує попереднього reassignment                        |
| Branch/own-agent read/write/query scope                 | є             | Clients/Deals ще немає, їхній scope треба реалізувати окремо                        |
| Invitations/reset/password/profile/sessions/login log   | є             | manual verified token delivery; email не налаштований                               |
| TOTP + encrypted secret + one-use recovery              | є             | потрібен runtime key; mandatory enrollment/key rotation/MFA reset не автоматизовано |
| Safe first-owner bootstrap / production demo-seed guard | є             | existing ADMIN promotion лише явною CLI командою з current password                 |
| Clients/Deals/Operations/Business/Backup                | план          | наступні B–F, не представлені фіктивними екранами                                   |

Цей розділ уточнює historical baseline rows вище. Повна enterprise CRM, verified backups і production readiness не заявляються.
