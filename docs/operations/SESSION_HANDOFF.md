# Handoff — Platform 2.0 foundation, 2026-10-29

Branch: `codex/platform-2-foundation`, base main `9dae815`. Completed audit + bounded foundation increment; full master scope remains ROADMAP. Do not merge/deploy automatically.

## Evidence and current runtime

48 unit, 14 browser/integration tests passed; lint/types/normal build and npm audit passed. Test DB is isolated tmpfs PostgreSQL on 55432; test server/build/media separate from development. Normal application started on loopback port 3000, `/api/health`, `/uk`, `/admin` return 200. Processes may need restarting after snapshot restore. Development migration applied only after confirming all 12 properties are DEMO and comparing original values before/after. No real production database was used.

Use README commands for local startup and guarded tests. Never use application DATABASE_URL as test fallback. Do not print .env or secrets. Initial administrator requires owner-supplied secure bootstrap variables; no default password was invented.

## GitHub / research blocker

Git proxy push works. `gh pr create --draft` failed because api.github.com GraphQL returned Forbidden. No actual PR URL is available. The compare URL is only a creation form: https://github.com/IvanRealit/realitna-agentura/compare/main...codex/platform-2-foundation?expand=1

Competitor URLs returned proxy CONNECT 403, so their features remain unverified. Environment draft preserves prior setup and adds api.github.com / backoffice.sk / www.backoffice.sk / realvia.sk / www.realvia.sk. Updated start_skill uses guarded test commands. Draft saved, requires environment-settings review/publication; running egress policy still has no custom allowed hosts. This is environment configuration, not production deployment. Once applied, retry research and actual PR creation; do not request a duplicate GitHub token without diagnosis.

## Next concrete increment

1. Review this branch, create PR after network access is applied, observe hosted CI; no green hosted result claimed yet.
2. Add Branch and seven-role migration with scoped query policy + negative cross-branch/API tests; preserve legacy MANAGER semantics until explicitly migrated.
3. Implement Client CRUD/roles/needs/consent and link Lead, then configurable Deal stages. Keep each vertical slice independently testable.
4. Before real customer data: explicit DEMO/production seed guard and separate admin bootstrap, MFA/recovery and private document boundary.
5. Implement encrypted consistent off-site backup + admin status/manual job + isolated restore drill; measure RPO/RTO before production approval.

Full app+DB+proxy staging compose, production deployment workflow and rollback remain unimplemented. Do not mistake the existing DB-only Compose or this runbook for a complete stack. See BACKUP_RESTORE, KNOWN_LIMITATIONS, TEST_REPORT and FEATURE_MATRIX.
