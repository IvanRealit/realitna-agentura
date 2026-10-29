# VPS: інструкція та поточні обмеження

Це підготовчий runbook для Hostinger/Contabo, **не виконане розгортання**. Повний production Compose/proxy/backup stack ще потрібно реалізувати й перевірити. Не купуйте ресурси та не відкривайте сайт без рішення власника. Спершу gates у `../DEPLOYMENT.md` і `../BACKUP_RESTORE.md`.

1. Оберіть підтримуваний Linux VPS з запасом RAM/disk для PostgreSQL, Node build і uploads. Зробіть окремого оператора з SSH key; вимкніть password/root login лише перевіривши другий SSH session. Налаштуйте security updates.
2. Установіть Docker Engine та Compose за офіційною інструкцією ОС. Firewall: SSH лише з довірених IP, HTTP/HTTPS лише після approval; PostgreSQL не відкривати в інтернет. Docker port publishing перевіряйте окремо від host firewall.
3. Клонуйте reviewed release SHA. Створіть runtime env поза Git із mode 600 або secret manager. DATABASE_URL — окремий користувач/пароль, SITE_URL — точний HTTPS origin, COOKIE_SECURE=true, UPLOAD_DIR — persistent writable volume. TRUST_PROXY=true лише якщо proxy замінює X-Forwarded-For і прямий порт закритий. Приклади паролів не використовувати.
4. Підготуйте private Docker network: app + PostgreSQL persistent volume + uploads volume; restart policies та health checks. Private documents зберігатимуться окремо. Root Compose зараз містить лише dev DB — не використовуйте його як готовий production stack.
5. Зберіть Dockerfile, запустіть міграцію один раз з release image (`npm run db:migrate`). Не запускайте seed зі справжніми даними без reviewed plan: він додає DEMO. Першого Super Admin створіть через `npm run db:bootstrap` без DEMO, видаліть bootstrap credentials з runtime.
6. App слухає лише loopback/private network. Reverse proxy (Caddy/nginx) обмежує body <=10 MB, timeouts, коректний client IP; перевірте security headers. Налаштуйте DNS A/AAAA для власного домену та HTTPS/renewal після owner approval. HSTS вмикати після перевірки всіх субдоменів.
7. Перевірте `/api/health`, login/logout, роль агента, REVIEW→PUBLISHED, lead з сайту, upload після restart; smoke на iPhone. Моніторьте health/5xx/latency, disk, DB, certificate expiry та last backup. Не пишіть PII/паролі в логи.
8. До оновлення: backup і успішний restore drill, перевірка SQL, staging smoke. Завантажте новий immutable image, migrate, restart app, health check. При помилці поверніть попередній image тільки якщо схема сумісна; restore даних потребує окремого підтвердження та показу впливу.

DNS/SSL, реальний VPS, monitoring, scheduled encrypted backup, restore та zero/low-downtime deployment тут не перевірені. Власник повинен мати доступ до recovery keys і покрокового tested restore до запуску справжніх клієнтських даних.
