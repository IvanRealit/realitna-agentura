# Identity security review — виконаний інкремент

Межі: внутрішній code review + unit/HTTP/browser checks, не незалежний penetration test і не юридична сертифікація.

- Password: bcrypt cost 12; нові паролі >=12 символів і <=72 UTF-8 bytes, без silent truncation. Старий login max128 збережено для сумісності наявних хешів; такі користувачі повинні безпечно змінити пароль.
- Sessions: random32-byte raw token лише HttpOnly cookie; PostgreSQL зберігає SHA256. Session creation locks User і перевіряє active/authVersion після password verification, щоб reset/block не залишав race bypass.
- TOTP: RFC6238 SHA1, 6 digits/30s, ±1 step; encrypted AES-256-GCM random nonce/AAD. Enrollment підтверджується password+кодом, відкликає ВСІ sessions/tokens; code counter зберігається та повторно не приймається. Точний час сервера потрібний (NTP).
- Recovery: 8 random96-bit codes, digest-only storage, одноразове споживання під User row lock. Concurrent використання одного коду має одного переможця. Інакше mutable array міг би воскресити використаний код — це усунено спільним row lock.
- Reset/invite: random256-bit token, digest-only DB; reset1h/invite24h; одноразове видалення і password/session updates атомарні. Reset не вимикає MFA; потрібен фактор/recovery. Invite лише inactive user; блокування/роль/password update інвалідує outstanding tokens. Email dispatch не реалізовано — ручний перевірений канал.
- Re-auth: own password change, enrollment і token issue потребують current password; factor потрібен для MFA користувача. Session revoke дозволено собі або user-admin (Super Admin захищено).
- Scope: negative direct-ID/query-filter/assignment tests, server SSR counts scope; Accountant не отримує inventory/PII, Auditor read-only бізнес-дані. Public team DTO select не містить auth fields; user API select виключає hashes/MFA/tokens/authVersion.
- API: Origin check, bounded JSON, per-IP/user DB limits, no-store для sensitive responses; tokens не в query URLs, не в localStorage. UI показує secret/recovery/token лише в поточному компоненті, очищується після navigation/reload.
- Logs: LoginEvent містить internal userId або null, result/reason/time, без password/IP/email/token. Purge видаляє expired tokens і login events за configured retentionDays. Existing purge має спрощену lead retention без legal hold — production blocker до review.

## Невирішені ризики й налаштування

MFA підтримується, але enrollment не примусово нав'язується всім старим адміністраторам. Власник має enroll до реальних даних; enforce-enrollment policy/recovery approval workflow — наступний security increment. Немає self-service MFA disable/reset або provider email delivery. Втрата MFA_ENCRYPTION_KEY + recovery material потребує окремої reviewed recovery процедури; key rotation ще не автоматизована. Backup/recovery ключа окремо від зашифрованих даних обов'язковий. Не вмикати реальні клієнтські дані до перевіреного backup/restore.

Legacy MANAGER лишається глобальним; нові branch ролі призначаються явно. Existing branchId=null не вгадується за містом. Global Admin робить контрольоване призначення; migration не вигадує філії. Повні clients/deals/private documents scope tests можливі після реалізації цих моделей.
