# Backup / restore — release blocker

**Стан: підсистема не реалізована. Автоматичного backup, S3, адміністративного екрана, шифрування та успішного restore drill немає. GitHub зберігає код, не дані. Production запуск заблокований до завершення цієї фази.**

## Цільова схема, не твердження про виконання

Потрібен один versioned recovery set: PostgreSQL dump, public media, майбутні private documents, конфігурації без секретів, code SHA, migration checksums, manifest/checksums. На час snapshot блокувати зміни файлів або застосувати узгоджені immutable file versions; pg_dump сам по собі не забезпечує узгодженість із uploads.

Окремий привілейований worker: daily, weekly full, monthly archive; encryption перед відправленням; S3-compatible off-site з versioning/object lock та окремим delete credential; configurable retention. Ціль 3-2-1 потребує ще незалежної копії/носія та підтвердження інфраструктури. Не класти runtime .env або OAuth tokens у незашифрований archive. Ключі відновлює уповноважений оператор з окремого secret manager; recovery key не зберігати поруч із backup.

Потрібні job locks, retry, audit, redacted logs, failure alert, last-success monitor, ручний admin run та pre-update backup. Налаштування S3, recipients, retention і key custody потребують власника; секрети вводити через secret manager, не чат.

## Обов'язковий ізольований restore drill

1. Перевірити manifest signature/checksums і доступність коду відповідної версії.
2. Створити нові ізольовані DB/media volumes, без маршрутів до production та без notification credentials.
3. Відновити БД і сумісний file set; перевірити migration/code compatibility, row counts, foreign keys, media checksums, login/RBAC та lead workflow.
4. Записати початок/кінець, обсяг, recovery point, результати й помилки. Перевірити corrupted/incomplete backup rejection.
5. Production restore — окрема дія: показати втрату змін після recovery point, affected DB/volumes, зупинку сервісу; отримати підтвердження адміністратора, зробити поточну safety copy. Ніякого автоматичного destructive restore.

**RPO/RTO фактично не виміряні.** Попередня ціль для погодження: RPO <= 24h, RTO <= 4h; це не гарантія. Наявні migration preservation tests не є backup/restore тестом. Retention, AML/GDPR та відновлення видалених PII узгодити з відповідальним фахівцем.
