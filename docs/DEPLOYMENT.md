# Розгортання

Поточний runnable локальний режим: README. Наявний container runbook: `deployment.md`; VPS покроково: `deployment/VPS_DEPLOYMENT.md`. Production не розгорнуто і не дозволено автоматично.

## Безплатний локальний staging

Використовуйте окремий checkout/worktree, власні DATABASE_URL/UPLOAD_DIR/SITE_URL та loopback port (наприклад 3300). Не підключайте development/production DB. Docker Compose для DB можна запустити з іншим project name, port і volume після перевірки конфігурації; наявний root Compose не є повним production stack. Тестова tmpfs DB — тільки для тестів, не staging storage. Не вмикайте public tunnel.

Повноцінний app+DB+reverse proxy staging compose ще не реалізований. Поточні browser integration tests піднімають ізольований runtime на 3101; він не призначений для тривалого перегляду.

## Release gates

Перевірений off-site encrypted backup/restore, MFA та scope review, налаштовані секрети і storage, legal/content review, зелений hosted CI, ручне owner approval. До цих перевірок Docker image не означає production readiness. DEMO seed у production відхиляється; first-owner bootstrap — `npm run db:bootstrap` без DEMO.

Git flow: feature branch → PR → tests/review → merge → staging smoke → protected production approval. CI є в `.github/workflows`, hosted результат у цій сесії недоступний. Deployment jobs/preview provider не налаштовані. Перед міграцією потрібен перевірений backup; rollback коду можливий лише з сумісною схемою, destructive DB rollback не автоматизовано.

Environment production: APP_ENV=production, COOKIE_SECURE=true, correct HTTPS SITE_URL, persistent UPLOAD_DIR, separately secured MFA_ENCRYPTION_KEY. db:seed відмовляється працювати в production; first owner через db:bootstrap. Production application user не потребує CREATEDB — цей привілей тільки для disposable test:bootstrap runner.
