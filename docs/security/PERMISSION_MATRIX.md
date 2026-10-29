# Перевірена compatibility policy

Власник: `src/modules/access/policy.ts`; enforcement: API та property service, SSR navigation використовує той самий policy. Це три наявні ролі. MANAGER має company-wide scope, **не** обмеження філії.

| Операція                    | ADMIN | MANAGER | AGENT                      |
| --------------------------- | ----- | ------- | -------------------------- |
| Read properties/leads       | усі   | усі     | власні                     |
| Create property             | так   | так     | власний DRAFT/REVIEW       |
| Edit property               | усі   | усі     | власний DRAFT/REVIEW       |
| Publish / assign property   | так   | так     | ні                         |
| Delete property             | так   | так     | ні                         |
| Edit/assign leads           | так   | так     | edit власних, без reassign |
| Delete lead                 | так   | ні      | ні                         |
| Content create/edit/delete  | так   | так     | ні                         |
| Users create/update/disable | так   | ні      | ні                         |
| Settings / audit            | так   | ні      | ні                         |
| Image upload                | так   | так     | так                        |

Невідома роль/resource/action — deny. Agent не може змінити demo/featured/agentId для обходу правил. Опублікований об'єкт повертає в DRAFT менеджер; Agent не редагує його напряму. Публікація лише після REVIEW та перевірки price > 0, хоча б одного image, SK description >= 40 символів. Це початковий quality gate, а не перевірка законності оголошення.

Сім ролей Super Admin / Admin / Branch Manager / Agent / Assistant / Accountant / Auditor — **план**, не доступні в UI. Перед їх увімкненням потрібні Branch, scope-safe queries та перевірка кожного resource/action на чужій філії. MFA ще не реалізовано.
