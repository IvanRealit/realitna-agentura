# Changelog

## 2026-10-29 — Platform 2.0 foundation

- Аудит baseline main 9dae815: inventory, залежності, ризики, чесний feature matrix, modular-monolith ADR.
- Competitor matrix з позначеним недоступним research; жодних неперевірених API claims.
- Fail-closed isolated E2E DB/server/build/media; Docker context виключає private/runtime data.
- Native lead та login/logout POST; credentials/PII не потрапляють у GET URL.
- Central legacy permission policy, REVIEW workflow, publication quality gate, conditional version writes та atomic audit metadata.
- Нижня mobile CRM navigation, safe-area та form sizing; 8-width regression suite.
- Additive migration зберігає наявні записи; існуючі маршрути збережено. API PATCH/DELETE property тепер потребує version/If-Match.

Повний CRM 2.0, сім ролей/філії, документи/фінанси/AML/backup та інтеграції залишаються roadmap; фактичні тести — TEST_REPORT.
