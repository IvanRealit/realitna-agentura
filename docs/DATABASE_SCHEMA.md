# Поточна база даних

Джерело істини: `prisma/schema.prisma`, SQL у `prisma/migrations`. PostgreSQL, Prisma pg adapter; міграції застосовує `scripts/migrate.ts` з lock, checksum і транзакцією. Застосовані файли не редагувати.

```mermaid
erDiagram
  User ||--o{ Session : sessions
  User ||--o{ Property : assigned
  User ||--o{ Lead : responsible
  Property o|--o{ Lead : inquiry
```

| Модель    | Дані та обмеження                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| User      | unique email, bcrypt passwordHash, ADMIN/MANAGER/AGENT, active, публічні bio/phone/avatar                                                  |
| Session   | hash token як id, user FK cascade, expiresAt index; raw token тільки в cookie                                                              |
| Property  | unique slug, локалізовані JSON translations/seo, характеристики, integer price EUR, media URL arrays, assigned user, demo, status, version |
| Lead      | контакт, message/kind/locale, consentAt/privacyVersion, відповідальний агент, nullable property FK set-null, notes, status                 |
| Content   | unique slug, kind, translations/SEO JSON, published                                                                                        |
| Settings  | singleton site, brand/contact, retentionDays                                                                                               |
| AuditLog  | actorId (без FK), action/resource/resourceId, metadata JSON, createdAt                                                                     |
| RateLimit | key, count, expiresAt index; спільний PostgreSQL rate limiter                                                                              |

`202610290001_property_review`: додає REVIEW, version=1 та audit metadata={}; без видалення або перейменування наявних полів. PATCH/DELETE Property потребують поточної version; умовний запис і audit відбуваються в одній транзакції. Price/status changes зберігаються в audit metadata, але це ще не окрема повна revision/price-history модель.

Немає таблиць Client, Branch, Deal, Calendar, Document, Finance, AML або Backup. Lead не називати повною CRM клієнтів. Сім ролей і branch scope потребують окремої міграції, міграційного плану та negative access tests. JSON translations мають fallback до SK; приватні майбутні поля не включати до public DTO.
