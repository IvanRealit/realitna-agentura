# Завдання №2: baseline та обраний інкремент

29.10.2026, Europe/Bratislava. Прочитано README, ROADMAP, EXISTING_SYSTEM, ARCHITECTURE, поточну Prisma-схему, auth/API/UI та останні коміти. `origin/main=fc6ce9f` вже містить PR #3 і весь перший етап. Нова гілка `codex/enterprise-foundation` створена від цього merge, без stacked dependency на незлитий PR. Початковий worktree чистий; базові lint/typecheck/48 unit passed.

Залишається один Next.js modular monolith з PostgreSQL. Сайт, property moderation/versioning, справжній Lead intake, три legacy ролі й базовий CMS працювали в першому етапі. Clients/Deals/Calendar/Documents/Finance/Backups не існували — вони не є готовими прихованими екранами. Декоративні модулі не додавалися.

Обраний стабільний інкремент цієї сесії: **етап A — identity/access/branches** із regression tests. Сім нових бізнес-ролей та compatibility MANAGER, persisted branch scope, user lifecycle, одноразові токени, sessions/login events, encrypted TOTP/recovery, seed/bootstrap separation. Наступний етап B потребує Client/Deal схем і окремих vertical slices. Повний master dataset не генерується до появи цих моделей.

Наявні development/test PostgreSQL доступні. Перевірки запису запускаються виключно через guarded test DB; migrations застосовуються локальному DEMO лише після перевірки збереження даних. Runtime/hosted CI/VPS/backup докази наведено окремо в TEST_REPORT, без перенесення старих результатів як нових.
