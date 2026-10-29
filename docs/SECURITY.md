# Безпека: перевірене та невирішене

Існуючі bcrypt passwords, hashed random sessions, HttpOnly/SameSite cookies, HTTPS Secure enforcement, Origin checks, DB-backed rate limits, Zod validation, parameterized SQL, bounded bodies та image decode/re-encode зберігаються. Baseline не має MFA/TOTP чи семи ролей/branch scope.

## Поточні safety gates

- E2E має окрему явно задану TEST_DATABASE_URL; remote/prod-like URLs і application DB відхиляються. Власні port/build/media + health run marker перевіряються до fixtures. Test process може довіряти своїм forwarding headers; production ingress повинен їх замінювати. Не відкривати test port в інтернет.
- Docker build context виключає runtime `data/`, private/backups/ключі, `.env` та кеші. Реальний canary-тест перевірив контекст без копіювання справжніх секретів. Не зберігати секрети в інших tracked-файлах: ignore rules не замінюють secret management.
- Native lead form використовує POST; PII не переходить у GET query коли JS вимкнено. API перевіряє Origin, ліміти та consent і повертає успіх лише після DB insert.
- `/uploads` лишається **публічним** media endpoint. Не завантажувати туди KYC, паспорт, договори чи інші приватні документи. Для них потрібен окремий storage і авторизований read/access audit.
- Всі юридичні тексти/retention/AML/DPH — чернетки до перевірки спеціалістами.

## Security review backlog

AUD-005/006: central policy + optimistic writes; AUD-007: MFA/recovery, failed login auditing, secret encryption/rotation; AUD-008: explicit dataset mode/seed guards; AUD-010/011/012: typed metadata/MIME errors/404 behavior. Повний backlog в EXISTING_SYSTEM. Неприпустимо вмикати AI відправлення PII або portal/email dispatch без потрібної конфігурації та human approval.

## Release blockers

Немає перевіреного encrypted off-site backup/restore, production MFA, private documents ACL, branch isolation або externally observed hosted CI у цій сесії. GitHub не є backup даних. Не робити destructive restore або deploy без погодженого runbook і підтвердження адміністратора. Значення секретів не включати в архіви, логи, чат, PR чи тестові artifacts.
