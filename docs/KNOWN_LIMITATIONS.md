# Поточні обмеження 2.0

Це продовження робочої версії 1.0, не завершена платформа 2.0. [Детальні baseline limits](limitations.md) залишаються чинними, якщо FEATURE_MATRIX не містить нових перевірених доказів.

- Повноцінних Clients/Deals/Calendar/Documents/AML/Finance/Marketing/Backups ще немає. Немає фіктивних екранів або статичних KPI під виглядом цих модулів.
- Seven-role/branch model та encrypted TOTP/one-time recovery реалізовані в етапі A. Legacy MANAGER лишається company-wide. Mandatory MFA enrollment, self-service MFA reset/disable і key rotation не реалізовані; потрібен runtime encryption key.
- Backups/restore і 3-2-1 — production blockers; текстові інструкції не є успішним recovery drill.
- Зовнішні research сайти і GitHub PR API блокуються поточною egress policy. Код-гілка може бути опублікована через Git proxy, але link compare не дорівнює створеному PR; hosted CI не підтверджений без спостереження.
- Нові тестові guards свідомо вимагають окрему локальну realitna*_test БД і забороняють довільний remote test server. Це safety constraint для цієї фази; захищені remote staging tests потребують окремого договору/маркування середовища.
- Перевірені widths не є гарантією всіх майбутніх екранів, WCAG AA certification чи нативного Safari behavior. PWA/offline drafts ще немає; PII не кешується для offline сценаріїв.
- Поточне сховище фото локальне. Конфіденційні документи потребують іншого access boundary та backup policy.
- DEMO: 12 об'єктів, 3 агенти, 3 статті; master dataset 20/5/30/15/10 вимагає спочатку реальних Client/Deal моделей і безпечного demo-clear workflow.

- Invitations/reset доставляються вручну перевіреним каналом, email провайдера немає. Account activation/security UI потребує JavaScript; native login/logout і public lead форми працюють без нього.
- Branch transfer блокується з active listings/open leads; mass reassignment wizard і Deals archive guard будуть додані з Deal модулем.

Наступні конкретні кроки та acceptance gates — ROADMAP.md. Не називати систему production-ready або повністю законодавчо compliant.
