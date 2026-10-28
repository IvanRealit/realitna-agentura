# Функціональна матриця конкурентів

Дата перевірки: 29.10.2026, Europe/Bratislava. Це незалежне планування власної реалізації, без копіювання коду, дизайну, матеріалів чи приватних API.

## Джерела та доступність

| Код | Публічне джерело                                        | Результат цієї сесії                                                         |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| B1  | https://www.backoffice.sk/realitny-software/            | CONNECT tunnel rejected, HTTP proxy 403; сторінку не отримано                |
| B2  | https://www.backoffice.sk/realitny-software/funkcie/    | CONNECT tunnel rejected, HTTP proxy 403; сторінку не отримано                |
| R1  | https://www.realvia.sk/                                 | CONNECT tunnel rejected, HTTP proxy 403; сторінку не отримано                |
| R2  | https://www.realvia.sk/funkcie                          | CONNECT tunnel rejected, HTTP proxy 403; сторінку не отримано                |
| U1  | MASTER TASK — REAL ESTATE PLATFORM 2.0, вимоги власника | Функціональний перелік для нашої платформи; не доказ можливостей конкурентів |
| C1  | `docs/audit/EXISTING_SYSTEM.md` + код main `9dae815`    | Перевірена початкова реалізація                                              |

Через мережеву політику неможливо перелічити й дослідити підрозділи сайтів. Позначка **НП** нижче означає «не перевірено», а не «відсутнє у конкурента». B1/B2/R1/R2 є кандидатами для повторного дослідження після дозволу доменів, а не підтвердженням конкретної функції. Для кожного підтвердження пізніше потрібні URL підсторінки, дата й короткий власний опис; рекламне твердження не прирівнюється до перевірки продукту.

## Порівняння та пріоритети

| Функція / власний опис              | backOFFICE | REALVIA  | Наша платформа, baseline                        | Пріоритет | Джерело вимоги / перевірки | Технічні залежності                                   |
| ----------------------------------- | ---------- | -------- | ----------------------------------------------- | --------- | -------------------------- | ----------------------------------------------------- |
| Публічний багатомовний каталог      | НП B1/B2   | НП R1/R2 | Реалізовано SK/UK/EN                            | P0        | U1 §3; C1 pages/i18n       | inventory, public DTO, SEO                            |
| Картка та медіа об'єкта             | НП B1/B2   | НП R1/R2 | Частково: CRUD, raster, external tour/PDF links | P0        | U1 §4; C1 Property/media   | storage, validation, RBAC                             |
| Модерація оголошень                 | НП B1/B2   | НП R1/R2 | Агент не публікує; окремого review немає        | P0        | U1 §4; C1 admin API        | workflow, history, concurrency                        |
| Історія ціни, приватні поля         | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §4                      | revisions, public DTO, permissions                    |
| Імпорт/експорт CSV/XLSX/XML         | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §4                      | staging import, mapping, batch jobs                   |
| PDF A4/A5 і watermark               | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §4                      | template renderer, media rights                       |
| Клієнти, компанії, кілька ролей     | НП B1/B2   | НП R1/R2 | Немає окремої Client                            | P0        | U1 §5                      | branches, ownership, PII policy                       |
| Потреби та автоматичний matching    | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §5/19                   | clients, normalized inventory, scoring                |
| Дублікати і merge                   | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §5                      | identity normalization, merge audit                   |
| Реальні заявки з сайту              | НП B1/B2   | НП R1/R2 | Реалізовано; progressive enhancement неповне    | P0        | U1 §3/6; C1 Lead           | forms, consent, dedup                                 |
| Угоди й налаштовувана воронка       | НП B1/B2   | НП R1/R2 | Немає Deal/Stage                                | P0        | U1 §6                      | clients, properties, stage history                    |
| Мобільний Kanban / table            | НП B1/B2   | НП R1/R2 | Немає pipeline                                  | P1        | U1 §6/14                   | accessible move action, stage service                 |
| Сім ролей, філії, permission matrix | НП B1/B2   | НП R1/R2 | Три legacy ролі, без branch scope               | P0        | U1 §7                      | policy module, schema migration                       |
| Команда, KPI, onboarding            | НП B1/B2   | НП R1/R2 | Профілі частково; KPI немає                     | P1        | U1 §7/19                   | branches, deals, calendar                             |
| Календар/покази/conflict prevention | НП B1/B2   | НП R1/R2 | Тільки заявка на перегляд                       | P0        | U1 §8                      | appointments, PostgreSQL constraints                  |
| Завдання/повторення/нагадування     | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §8                      | scheduler, jobs, notifications                        |
| Google Calendar OAuth               | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §8                      | official scopes, OAuth keys, tokens                   |
| Документи/версії/підписання         | НП B1/B2   | НП R1/R2 | PDF links лише публічні                         | P0        | U1 §9                      | private store, access audit, antivirus                |
| Шаблони DOCX/PDF з CRM              | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §9                      | client/deal fields, legal drafts                      |
| Google Drive OAuth                  | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §9                      | provider documentation, minimal scopes                |
| AML/KYC технічна підтримка          | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §10                     | sensitive data RBAC, retention, review                |
| GDPR export/anonymization           | НП B1/B2   | НП R1/R2 | Consent + простий purge; частково               | P0        | U1 §10                     | identity check, legal holds, backups                  |
| Комісії/частки/прибуток             | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §11                     | deals, integer money, formula tests                   |
| Рахунки/DPH/PDF/QR                  | НП B1/B2   | НП R1/R2 | Немає                                           | P1        | U1 §11                     | numbering transactions, accountant review             |
| Портальні feeds та sync             | НП B1/B2   | НП R1/R2 | Неактивний adapter boundary                     | P1        | U1 §12; C1 crm.ts          | official agreements, queues, mappings                 |
| Social copy/assets/UTM/QR           | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §12                     | approved inventory DTO, attribution                   |
| Email campaigns                     | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §12                     | marketing consent, unsubscribe, provider              |
| Co-broke/партнерські агентства      | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §12/19                  | partner ACL, agreements, commissions                  |
| Optional AI drafts/translations     | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §13                     | opt-in provider keys, redaction, human approval       |
| iPhone CRM, PWA, offline            | НП B1/B2   | НП R1/R2 | Responsive частково; PWA/offline немає          | P0        | U1 §14                     | mobile tests, safe cache, conflict detection          |
| Encrypted off-site backup/restore   | НП B1/B2   | НП R1/R2 | Немає automation/drill                          | P0        | U1 §15                     | consistent snapshot, encryption, S3, isolated restore |
| MFA/TOTP/audit/security             | НП B1/B2   | НП R1/R2 | Sessions/3 roles/audit частково, MFA немає      | P0        | U1 §16                     | secrets encryption, recovery, policy tests            |
| Єдина CRM navigation/search/bulk    | НП B1/B2   | НП R1/R2 | Лише базові staff tabs                          | P1        | U1 §17                     | module registry, scoped search, jobs                  |
| Реальна аналітика/експорт           | НП B1/B2   | НП R1/R2 | Три database counts; частково                   | P1        | U1 §18                     | event history, finance, scoped reports                |
| Іпотечний калькулятор               | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §19                     | configurable rates, estimate disclaimer               |
| Developer projects/units            | НП B1/B2   | НП R1/R2 | Немає                                           | P2        | U1 §19                     | project/building/unit schema, reservation locks       |
| Один VPS: HTTPS/monitoring/rollback | НП B1/B2   | НП R1/R2 | Docker image + DB compose; частково             | P0        | U1 §20                     | reverse proxy, secrets, backups, health               |
| GitHub PR/CI/release approvals      | НП B1/B2   | НП R1/R2 | CI workflow; deployment automation немає        | P0        | U1 §21                     | branch protection, environments, backup gate          |

Підсумкові статуси нашої реалізації оновлюються в [FEATURE_MATRIX](../FEATURE_MATRIX.md). Жодна «НП» не повинна автоматично перетворюватися на конкурентну перевагу або твердження, що конкурент не має функції.
