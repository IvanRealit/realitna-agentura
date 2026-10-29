# Enterprise permissions — етап A

Джерело істини: `src/modules/access/policy.ts`. Усі API та SSR перевіряють capabilities і scope. Сім цільових ролей доступні; MANAGER збережено як compatibility роль із company-wide правами. Не перейменовувати його автоматично на BRANCH_MANAGER.

Позначення: R read, C create, U update, D delete, A approve/publish, E export capability, S assign. E — зарезервоване право: endpoint експорту ще не реалізовано. Право не означає наявність функції.

| Роль           | Properties | Leads | Users | Branches | Content | Settings/Audit         | Scope                                                    |
| -------------- | ---------- | ----- | ----- | -------- | ------- | ---------------------- | -------------------------------------------------------- |
| Super Admin    | RCUDAES    | RUDES | RCU   | RCU      | RCUD    | settings RCU / audit R | компанія; може керувати Super Admin                      |
| Admin          | RCUDAES    | RUDES | RCU   | RCU      | RCUD    | settings RCU / audit R | компанія, крім Super Admin management                    |
| Branch Manager | RCUDAES    | RUES  | —     | R        | —       | —                      | лише власна філія; null branch = deny                    |
| Agent          | RCU        | RU    | —     | R        | —       | —                      | власні properties/leads, branch metadata своєї філії     |
| Coordinator    | RCUS       | RUS   | —     | R        | —       | —                      | своя філія; лише Draft/Review writes, без publish/delete |
| Accountant     | —          | —     | —     | —        | —       | —                      | власна account security; Finance ще не створено          |
| Auditor        | R          | R     | —     | R        | —       | audit R                | компанія, без змін бізнес-даних/експорту                 |
| MANAGER legacy | RCUDAES    | RUS   | —     | R        | RCUD    | —                      | компанія, збережена попередня семантика                  |

Всі підтримувані ролі мають власний profile/password/MFA/sessions екран. Media upload дозволений операційним ролям, не Accountant/Auditor. Невідомі ролі/resources/actions — deny. Auditor може змінити власне account security, але не бізнес-записи.

## Scope та переходи

- Read lists та direct ID використовують AND(actor scope, requested id, optional branch filter). Query parameter не може розширити доступ.
- Write перевіряє наявний record scope й destination agent/branch. BranchId property derive з призначеного active user; arbitrary posted branchId ігнорується.
- Agent не змінює featured/demo/assignment, не публікує. Coordinator може призначати тільки в межах філії; published/reserved/sold records для нього read-only.
- Branch Manager не має доступу до user administration; Admin/Super Admin призначає персонал і branch. Branch manager визначається User.role + User.branchId; кілька менеджерів філії дозволено.
- Transfer працівника блокується, поки є active property або незакриті leads. Спершу перепризначте їх. Закриті історичні записи зберігають branchId; mass transfer wizard ще не реалізовано.
- Archive branch потребує відсутності active staff, active listings і open leads; фізичного DELETE немає. Deals ще немає: при додаванні обов'язково розширити archive guard.
- User update/block/role/password change відкликає всі sessions/tokens та збільшує authVersion. Самоблокування/самопониження адміністратора заборонені. Лише Super Admin керує іншими Super Admin.
