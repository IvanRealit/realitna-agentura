# Звіт перевірок платформи 2.0

Сесія: 29.10.2026 (Europe/Bratislava). Не переносимо старі результати як нові. Production не використовується для тестів.

## Аудит baseline main 9dae815

- lint, typecheck, 17 unit: passed.
- PostgreSQL development: доступний, 12 DEMO properties, 3 demo agents, 0 leads, 3 articles.
- HTTP на початку: connection refused; після restart наявної збірки сервер доступний. Живі процеси не пережили відновлення середовища.
- Research URLs: proxy CONNECT 403. GitHub PR API: Forbidden. Жодної перевірки функцій конкурентів/hosted CI через ці джерела не виконано.

## Safety foundation — виконано

| Перевірка                                               | Фактичний результат                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| lint / typecheck                                        | Passed                                                                                                      |
| Unit tests                                              | 33 passed, 3 files                                                                                          |
| Guard без TEST_DATABASE_URL                             | Очікуваний exit 1 **до** будь-яких fixtures                                                                 |
| Guard небезпечних URL / однакових БД / direct execution | Negative unit cases passed                                                                                  |
| Новий тестовий PostgreSQL                               | Окремий tmpfs container, loopback port 55432; development database не використано                           |
| Test build                                              | `.next-test`, passed, відмінний build origin для metadata regression                                        |
| Playwright                                              | 12 passed на тестовій БД та власному сервері 3101                                                           |
| Native form, JavaScript disabled                        | Реальний POST зберіг 1 fixture lead, redirect не містить PII, українські/англійські feedback keys збережено |
| 8 viewport widths                                       | Public home/catalog + staff dashboard/properties/editor: без root horizontal overflow, без JS page errors   |
| Реальний Docker context audit                           | data/private canary, .env, node_modules, .next/.next-test відсутні; безпечний .env.example присутній        |
| robots runtime origin                                   | Sitemap URL використовує runtime origin, а не build-only.invalid                                            |

Матриця ширин перевіряє наявні екрани; це не перевірка майбутніх AML/Finance/Calendar UI, не повний WCAG 2.2 AA і не фізичний iPhone. Browser — system Chromium. Test DB/media/build ізольовані; fixtures очищають лише власні записи.

## Ще не перевірено / не реалізовано

Повна seven-role/branch security matrix; client/deal/calendar/document/finance workflows; MFA; encrypted off-site backup та restore drill; disaster recovery; production upgrade/rollback; OAuth/portal/mail/AI providers; hosted CI status; реальний VPS/TLS/DNS. Деталі в FEATURE_MATRIX та KNOWN_LIMITATIONS. Production readiness не підтверджено.
