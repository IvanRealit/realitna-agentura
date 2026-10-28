# Аудит наявної системи — початкова точка 2.0

Дата: 29 жовтня 2026, Europe/Bratislava. Базовий коміт `9dae815` (main, merge PR #2). Робочий стан перед аудитом чистий; попередній застосунок збережено. [Інвентаризація 78 tracked-файлів](FILE_INVENTORY.json) містить розміри, SHA-256, імпорти та синтаксичний аналіз TypeScript; локальні секрети, node_modules, кеші й персональні дані виключені. Бінарні медіафайли перевіряються як ресурси, не як програмний код.

## Реальна архітектура

Один Next.js App Router застосунок, TypeScript strict, Tailwind v4/CSS, PostgreSQL 17, Prisma 7.10.1 з pg adapter і WASM-генерацією. Публічний сайт, staff UI та API логічно розділені маршрутами, але розгортаються одним Node-процесом. Вісім моделей: User, Session, Property, Lead, Content, Settings, AuditLog, RateLimit. Повноцінних CRM-сутностей ще немає; джерело істини — Prisma-схема.

`src/components/admin.tsx` — великий універсальний редактор із бізнес-залежними умовами. `api/admin/[resource]` об'єднує перевірки прав, запити й записи в одному handler. Це робоча база, але не підстава додавати туди ще десятки сутностей. Нові модулі мають власні services/schemas, API лишається адаптером.

## Підтверджений поточний стан

- Повторно пройшли lint, typecheck та 17 unit-тестів на початковому коді. Історичний звіт містить 10 E2E; у цій сесії вони ще не були повторені до ізоляції тестової БД.
- PostgreSQL доступний: 12 DEMO-об'єктів, 3 демонстраційні агенти, 0 заявок, 3 публікації. Це контрольні числа локального demo, не бізнес-аналітика агентства.
- На початку HTTP-процес не працював (ECONNREFUSED). Наявну production-збірку запущено повторно; окрема перевірка HTTP і медіа записується у TEST_REPORT.
- Поточний Docker Compose містить лише PostgreSQL; Dockerfile існує та має історичну успішну перевірку. Nginx/HTTPS/cron/backup/restore автоматизації немає.
- Git main уже містить попередню реалізацію через PR #2. Жодного нового production deployment не виконано.

## Що реалізовано

| Область        | Стан та докази                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Публічний сайт | SK/UK/EN, локалізовані URL, SSR, головна, каталог, деталі, категорії, послуги/про нас/команда/контакти/оцінка, блог, юридичні чернетки, 404. `src/components/pages/*`, `src/lib/i18n.ts` |
| Пошук          | URL-фільтри, сортування, пагінація; карта — opt-in OSM для поточної сторінки, не повноцінний multi-marker пошук. Обране локальне, порівняння відсутнє                                    |
| Об'єкти        | CRUD, 6 статусів, переклади/SEO, фото, посилання на відео/тур/PDF/план. Немає власників-клієнтів, філій, історії цін/версій/модераційного workflow                                       |
| Заявки         | Реальне збереження, consent timestamp/version, відповідальний агент, 3 статуси, нотатки. Немає окремого Client, Deal, pipeline, календаря                                                |
| Авторизація    | bcrypt, random token/hash у БД, HttpOnly/SameSite cookies, 8 годин, Origin checks, shared PostgreSQL limits. Тільки ADMIN/MANAGER/AGENT, без TOTP/MFA і філій                            |
| CMS            | Plain-text сторінки/блог/переклади/SEO, бренд і контакти. Меню, банери, кольори, логотип не редагуються повністю                                                                         |
| Медіа          | Авторизований upload raster, magic bytes, Sharp decode/re-encode, UUID WebP, 8 MB/40 MP. Усі `/uploads` публічні; це **не** сховище конфіденційних документів                            |
| SEO            | canonical/hreflang/OG/sitemap/robots/JSON-LD, DEMO listings noindex. Region pages відсутні у sitemap; повний SEO-аудит не виконаний                                                      |
| CI             | Workflow lint/types/unit/E2E/build/audit. Hosted статус цієї сесії не отримано через GitHub API deny                                                                                     |
| Інтеграції     | Лише явний неактивний CrmAdapter. Немає зовнішніх API, mail, OAuth, AI чи portal feeds                                                                                                   |

## Знахідки та пріоритети

| ID      | Пріоритет | Знахідка                                                                                                             | Дія / перевірка                                                                                   |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| AUD-001 | P0        | Playwright і fixtures успадковують звичайну DATABASE_URL з .env; немає fail-closed тестової БД                       | Окрема TEST_DATABASE_URL, dedicated port/media/build; guard до імпорту fixtures; negative tests   |
| AUD-002 | P0        | `.dockerignore` не виключає `data/`; `COPY . .` + весь `/app` у runtime можуть включити робочі uploads/private files | Виключити runtime data/backups/credentials; перевірити clean image з canary без реальних секретів |
| AUD-003 | P0        | Немає backup implementation/restore drill; документація лише рекомендує резервування                                 | Окремий blocking release gate. Жодних тверджень про production-ready backup                       |
| AUD-004 | P1        | LeadForm без native action/method: без JS браузер може надіслати PII як GET query                                    | Реальний progressive-enhancement POST, без PII у URL, перевірити з JS disabled                    |
| AUD-005 | P1        | Ролі перевіряються умовами в UI/API; немає permission matrix/branch scoping                                          | Спочатку один deny-by-default policy module, потім міграції ролей/філій з contract tests          |
| AUD-006 | P1        | Немає optimistic concurrency; одночасний PATCH може тихо перезаписати зміни                                          | Version preconditions і конфлікт 409 перед наступними offline/bulk сценаріями                     |
| AUD-007 | P1        | Немає MFA для admin, журналу невдалих входів, ротації/управління інтеграційними секретами                            | Окремий security етап; не заявляти повний захист production                                       |
| AUD-008 | P1        | Runtime конфігурація не має явного demo/test/production mode; seed завжди додає demo                                 | Безпечне розділення режимів і guard для seed/clear; admin bootstrap відокремити від demo          |
| AUD-009 | P2        | Admin списки обмежені 200, favorites 500; немає серверного staff search/pagination                                   | Окремий paging contract зі збереженням сумісності                                                 |
| AUD-010 | P2        | MIME/decode errors можуть повернути 500; відсутній реєстр файлів та orphan cleanup                                   | Валідація Content-Type, коректні 4xx; приватні документи — інший storage boundary                 |
| AUD-011 | P2        | SEO/bio JSON надто вільні, можуть містити нестрокові значення                                                        | Typed localized metadata schemas і regression tests                                               |
| AUD-012 | P2        | P2025/missing DELETE може стати 500, зайві сегменти API ігноруються                                                  | Явні 404/405 та shape guards                                                                      |
| AUD-013 | P1        | Мобільна перевірка раніше лише 390 px, CRM без нижньої навігації, touch targets/16px inputs не перевірені            | Матриця 8 ширин, справжні mobile editor flows; WCAG 2.2 AA залишається ціллю                      |
| AUD-014 | P1        | Audit має actor/action/id, без before/after, журналу читання документів і захищеного зовнішнього зберігання          | Додати в модулі історію та access audit без PII у звичайних логах                                 |

## Відсутні модулі

Client/roles/preferences/matching/merge; Deal/pipeline; Branch; Appointment/Task; Document/version/template/signing; AML/KYC; Finance/invoices/commission; marketing/portals/queue; OAuth/Google Drive/Calendar; optional AI; operational backups/restore/monitoring; PWA/offline conflict management; real estate development units; co-broke. Вони внесені до FEATURE_MATRIX і ROADMAP, а не замінені фіктивними екранами.

## Межі висновків

Це аудит коду й локальної development-машини. Немає доступу до production, зовнішніх API/угод, DNS/SSL/бухгалтерських або юридичних налаштувань. Немає підтвердження WCAG, повної GDPR/AML відповідності, S3 Object Lock, off-site backup або досягнутого RPO/RTO. Майбутні можливості повинні мати власні тести та докази.
