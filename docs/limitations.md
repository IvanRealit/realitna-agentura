# Current scope and production prerequisites

The public/catalog/database/staff/lead workflows are implemented and runnable. These are concrete remaining limits, not claims of working integrations:

- No REALVIA/backOFFICE calls, email/SMS delivery, SSO/MFA or password-recovery email provider. Administrators reset staff passwords securely through the workspace. Notifications are in-app counts refreshed every 30 seconds.
- Media uses a local persistent volume on one instance. Object storage, antivirus scanning of external documents, reference-aware orphan cleanup and CDN invalidation are future adapters. Only raster image uploads are allowed. PDFs, videos, floor plans and tours are supported as links, not arbitrary file uploads.
- OpenStreetMap is an opt-in external embed. Catalog map points cover the current paginated result set and can be selected from a list; there is no custom interactive multi-marker map or geocoding service. DEMO coordinates indicate city centers. No map provider keys are needed.
- Favorites and consent belong to the browser device; there is no public customer account or cross-device synchronization.
- Staff UI is Slovak. Public UI/routes/SEO and property/content translations support SK/UK/EN. Content is plain text, intentionally not unsanitized rich HTML. Staff tables return the newest 200 records; a large agency needs dedicated server-side staff search/pagination. Public favorites render from up to 500 published properties.
- Legal text, retention rules, identity, real contacts and branding require owner/legal review. Demo images are AI illustrations and reused across seed records; replace them with authorized photos for actual listings. The seed must not be treated as a production import.
- Role management is the explicit Admin/Manager/Agent matrix, not arbitrary per-field ACL editing. Audit captures login, staff writes, uploads and retention purges; it is not an immutable external compliance archive.
- SEO city/region pages derive from existing published inventory; there are no invented market statistics or fake local landing-page claims.
- The migration runner supports transactional PostgreSQL SQL and a Prisma-compatible ledger. Prisma 7 internals are pinned to matching versions for engine-free generation; upgrades need regression tests. Optional Prisma Studio/CLI native engines may require allowing `binaries.prisma.sh` in restricted environments.
- Production build and local checks do not prove DNS, hosted TLS, disaster recovery or third-party services. No production publication is authorized or performed.
