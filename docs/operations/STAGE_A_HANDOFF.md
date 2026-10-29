# Завдання №2 — стабільний етап A

Дата: 29.10.2026 (Europe/Bratislava). Branch `codex/enterprise-foundation`, base `origin/main fc6ce9f` (merged PR #3). Це завершений identity/branches інкремент, не повна enterprise CRM. Не робити merge/deploy без власника.

## Реально працює з PostgreSQL

Branch CRUD/archive/version/контакти/commission setting/counts; сім ролей та legacy MANAGER; scope списків/direct IDs/assignments/SSR counts; create/update/block/branch/role/password user lifecycle; profile, sessions/revocation, login events; invitations/reset one-use tokens; encrypted TOTP/recovery replay protection. Існуючі сайт, properties/review, persisted lead, CMS збережені.

Branch Manager/Coordinator мають явну branch; null scope deny. Accountant поки тільки account security, Finance не імітується. Auditor business read-only. Archive блокується з active users/listings/open leads; full transfer wizard та Deal guard — наступні модулі. Employee transfer потребує попереднього reassignment активних записів.

## Перевірки

Baseline 48 unit/lint/types пройдено до змін. Після змін: 62 unit, 20 browser/HTTP/PostgreSQL, окремий disposable bootstrap test, lint/typecheck/format/build, dependency audit. Фактичні фінальні результати та обмеження — TEST_REPORT. Поточні тестові дані ізольовані від application DB. Development migration зберегла рядки п'яти існуючих таблиць, включно з 12 property/3 user; реальних production даних не використовували.

## Запуск та owner bootstrap

1. Node24, PostgreSQL17. `cp .env.example .env` лише якщо немає чинної конфігурації. Налаштуйте DATABASE_URL/SITE_URL/UPLOAD_DIR без друку секретів. `npm ci --ignore-scripts`, `npm run db:generate`, `npm run db:migrate`.
2. DEMO: APP_ENV=demo, `npm run db:seed`; справжній production контент не змішуйте з seed. Він не створює адміністратора.
3. Для першого власника задайте SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD у secure env, `npm run db:bootstrap`, приберіть bootstrap змінні. Новий пароль >=12 символів і <=72 UTF-8 bytes. Default password немає. Existing ADMIN promotion лише `npm run db:bootstrap -- --promote-existing` із його current credentials, якщо Super Admin ще немає.
4. Налаштуйте MFA_ENCRYPTION_KEY (32 random bytes / 64 hex), збережіть recovery key окремо та enroll owner через `/admin/security`. Не змінюйте вже налаштований ключ навмання. Зараз ключ для звичайного local runtime автоматично не створюється; test runner injects лише test-only key. Mandatory enrollment ще не enforced.
5. `npm run dev` або `npm run build && npm start`. Site `/sk`, `/uk`, `/en`; CRM `/admin`; Branches `/admin/branches`; Security `/admin/security`; token entry `/account/activate`. Cloud loopback не є публічним preview і не відкривається напряму на iPhone.

## Перевірка на iPhone

Playwright перевіряє Chromium mobile widths 320/375/390/430/768/1440 для Branch/Security та 8 widths existing screens. Фізичний Safari/iPhone не перевірено. Для реального пристрою потрібне погоджене private HTTPS staging/VPN або локальний запуск на власному комп'ютері в приватній мережі з правильною SITE_URL; не передавайте справжні credentials через public HTTP і не відкривайте public tunnel без дозволу. Перевірте login/TOTP, нижню navigation, Branch create/save, user assignment, profile/password/logout, keyboard zoom, overflow та camera uploads. HEIC/device camera ще не сертифіковані.

## Backup / restore

Не реалізовані; команд запуску робочої підсистеми немає. Не підміняти backup GitHub або migration preservation snapshot. `docs/BACKUP_RESTORE.md` описує наступні gates. До real customer data потрібні справжній encrypted archive/S3/retention і isolated restore drill. RPO/RTO не виміряні.

## GitHub та налаштування середовища

Git proxy працює; api.github.com і research domains досі не включені до effective runtime egress. Дозволи вже збережені в environment draft, потребують застосування в environment settings. Після цього створити PR, спостерігати hosted CI; не називати його green на основі локальних тестів. Compare URL — форма створення, не фактичний PR.

## Наступні конкретні коміти

1. B1: Client person/company/multi-role schema, validated contacts/consent/retention, indexes/duplicate detection, scoped CRUD/search/mobile quick-add + direct-ID cross-branch tests.
2. B2: Lead→Client association і dedup transaction, first response timestamps, priorities/next action, manual phone inquiry та CRM notifications.
3. B3: Deal/stage/event schema, configurable pipeline, versioned stage transitions, mobile table + Kanban; add Deal constraints to branch archive/transfer.
4. C: Appointment/Task/client/property relations, conflict-safe booking, recurrence/timezone and matching with explained score.
5. D–F: private documents/finance/analytics; real backup/restore and MFA enforcement/key recovery; full staging/VPS stack, Safari та hosted CI.

Full demo dataset 5 agents/3 branches/30 clients/25 properties/20 leads/15 deals/30 tasks/15 viewings додається лише після відповідних моделей і safe DEMO clear. Зараз збережено існуючі 12/3 demo listings/agents та 3 articles; фіктивні Client/Deal JSON-макети не створювалися.

## Підсумок Git

Feature branch надіслана в origin. Draft PR create спроба завершилась `Post https://api.github.com/graphql: Forbidden`; фактичний PR не створено. Підготовлений reviewable description: STAGE_A_PR_DESCRIPTION.md. Форма створення (не PR): https://github.com/IvanRealit/realitna-agentura/compare/main...codex/enterprise-foundation?expand=1 . Main не змінювався/не merge, production не публікувався. Після застосування збережених environment egress settings повторіть PR create та перевірте hosted CI.
