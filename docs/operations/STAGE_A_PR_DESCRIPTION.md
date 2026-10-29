## Problem and resulting behavior

The merged Platform 2.0 foundation had three roles and no persisted branches or account recovery/MFA. This increment implements the Task #2 Foundation stage in the existing modular monolith: seven target roles plus compatibility MANAGER, branch-scoped inventory/inquiries, real user lifecycle and encrypted TOTP/recovery.

## Changes

- Add Branch, AccountToken and LoginEvent, nullable branch ownership, authVersion and encrypted MFA fields without rewriting existing users/listings.
- Scope property/lead lists, direct IDs, requested branch filters, assignments and SSR counts; preserve legacy company-wide MANAGER semantics.
- Branch CRUD/archive/version/contact/commission settings and live database counts; archive/employee-transfer guards.
- User create/edit/block/role/branch changes, own profile/password, sessions/revocation and login history.
- Digest-only one-use invitation/reset tokens with manual verified delivery; reset retains MFA and invalidates sessions.
- RFC6238 TOTP, AES-256-GCM secret custody, monotonic code/recovery replay protection and session invalidation on enrollment.
- Separate first-owner bootstrap, explicit existing-admin promotion and production DEMO seed rejection.
- Responsive Branch/Security UI, API/permission/security documentation and explicit B–F continuation.

## Validation

- Baseline lint/typecheck/48 unit passed before changes; final lint/typecheck/format/build and 62 unit passed.
- Full Playwright suite: 20 passed on guarded isolated PostgreSQL; 6 enterprise tests re-run after final styles/API guard passed.
- Disposable bootstrap integration passed: first owner, repeated creation refusal, no DEMO side effects, production seed guard, explicit legacy promotion.
- Local additive migration preserved old columns in User/Property/Lead/Content/Settings, including 12 DEMO listings/3 fake users.
- npm audit: 0 known vulnerabilities at check time. Hosted CI, physical iPhone and production deployment not observed.

## Configuration and risk

Apply 202610290002_enterprise_identity before new runtime; production requires separately approved verified backup/recovery workflow. Existing null branch IDs are not guessed/backfilled; administrators assign deliberately. MFA_ENCRYPTION_KEY must be configured securely before enrollment; no production fallback key. Test runner injects a test-only key. Existing administrators are not automatically forced to enroll; rotation/reset policy remains follow-up. Email delivery is not implemented; use verified manual token delivery. test:bootstrap requires CREATEDB on the isolated test DB user only.

Clients/Deals/Calendar/Documents/Finance/real backups remain unimplemented stages B–F, not placeholder CRM screens. Full demo dataset and actual restore drill remain pending. No main merge, paid resources or production changes performed. See docs/operations/STAGE_A_HANDOFF.md, docs/TEST_REPORT.md and docs/security/IDENTITY_REVIEW.md.
