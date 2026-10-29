# Інтеграції: фактичний стан

Існуючий `src/lib/crm.ts` — контракт майбутньої CRM інтеграції, не підключений провайдер. REALVIA/backOFFICE/portals не працюють. Офіційні endpoints, API contracts, sandbox і credentials відсутні; жодних приватних endpoints не вигадано. Public research заблокований proxy CONNECT 403; див. research/COMPETITOR_FEATURE_MATRIX.md.

Google Drive/Calendar OAuth, email, S3 backup, AI і зовнішня аналітика не підключені. Підготовлений текст чи interface не означає sync. Форми зберігають Lead у БД, не обіцяють email delivery. Analytics не завантажується навіть після opt-in, доки немає провайдера.

Наступна реалізація: independent adapters, validated mapping/public DTO, preview, idempotency key, outbox/job retries, redacted error log та per-provider status. Спершу офіційний контракт і sandbox test; потім enable flag. OAuth мінімальні scopes, encrypted token custody/rotation, revoke flow. AI лише opt-in з ключем, без PII за замовчуванням і з human approval перед публікацією/відправленням. Дані третіх осіб не експортувати без належних дозволів.
