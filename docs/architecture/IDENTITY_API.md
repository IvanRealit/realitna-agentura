# Identity / Branch HTTP contracts

JSON, same-origin credentials. Write: exact Origin=SITE_URL, bounded input, rate limits. Sensitive responses Cache-Control:no-store. 400 validation, 401 no auth/invalid factor, 403 permission, 404 missing route, 409 lifecycle/version conflict, 428 missing version.

| Метод / URL                       | Контракт                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| GET /api/admin/branches[/id]      | Scoped array, branch fields + counts(users/properties/leads); no pagination beyond current small dataset            |
| POST /api/admin/branches          | Admin/Super: name/city/address/phone/email/active/publicContact/commissionBps(0..10000)                             |
| PATCH /api/admin/branches/id      | Same + current version; archive guard; DELETE not supported                                                         |
| GET /api/admin/users              | Admin/Super user DTO без passwordHash/MFA/token material                                                            |
| POST/PATCH /api/admin/users[/id]  | name/email/role/active/branchId + optional password, phone/avatar/bio; creating requires password                   |
| GET /api/identity/security        | own profile, MFA enabled/configured flags, own live sessions; 50 own LoginEvents, admin sees company events         |
| POST /api/identity/profile        | own name/phone                                                                                                      |
| POST /api/identity/password       | current password, newPassword, code if MFA; invalidates all sessions/tokens                                         |
| POST /api/identity/revoke-session | id=current session digest ID or "all"; optional userId requires user-admin                                          |
| POST /api/identity/issue-token    | admin current password/code + userId + INVITE/RESET; returns plaintext token ONCE, expiresAt, MANUAL_SECURE_CHANNEL |
| POST /api/identity/redeem         | public, token/new password as password/code if enrolled; atomic one-use, no URL token                               |
| POST /api/identity/mfa-setup      | current password; requires MFA_ENCRYPTION_KEY; returns secret + otpauth URI once                                    |
| POST /api/identity/mfa-enable     | current password + current TOTP code; recoveryCodes once, revokes sessions                                          |
| POST /api/auth/login              | email/password + optional code (TOTP/recovery); native POST also supported                                          |

Property/Lead list accepts optional branchId filter; it intersects actor scope. Clients/Deals APIs не створені. Export capability — резерв майбутнього endpoint, не готовий export.

MFA_ENCRYPTION_KEY: 32 cryptographically random bytes encoded as 64 hex characters. Secret generated externally into secure runtime settings, never a build arg or source code. Test runner sets an explicitly test-only key inside isolated process, no production fallback. UI enroll disabled without valid configured key. `/account/activate` requires JavaScript for JSON submission; all forms use POST so private fields cannot fall back into GET query.
