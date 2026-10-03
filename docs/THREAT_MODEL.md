# Threat model (short)

Scope: FoodApp demo API + CRA frontend as reviewed in hardening phases P0–P2.

## Assets
- User accounts (email, password hash, role)
- Bookings and payment confirmation state
- Admin plan/section/RAG controls
- Razorpay keys, JWT secret, mail credentials (env)

## Actors
- Anonymous visitor
- Logged-in user
- Admin (`role: admin`)
- Attacker with network access to the public API

## Top risks → controls

| ID | Risk | Control |
|----|------|---------|
| T1 | Credential stuffing / weak storage | bcrypt; auth rate limit; no password in API responses |
| T2 | Session theft via XSS | httpOnly cookie + Bearer; avoid storing secrets in JS (JWT in cookie preferred long-term) |
| T3 | IDOR on bookings/delivery | Protect routes; bind owner; admin-only status flips |
| T4 | Fake payment confirm | HMAC verify with `KEY_SECRET`; confirm only owned bookings |
| T5 | Secret leak in git | Env-only; rotate exposed values; scrub PoC copies |
| T6 | Admin UI exposure | FE `RequireAdmin`; BE `protectAdminRoute` |
| T7 | Upload abuse | Size + MIME checks |

## Out of scope (honest)
- Full WAF / DDoS
- Formal pen-test report
- PCI DSS (Razorpay hosts card data)
- Perfect a11y / Lighthouse 100

## Residual
- Nested `foodAppFrontend/Backend` and `poc/` are legacy; prefer root `Backend/`.
- JWT is an httpOnly cookie. Mutating routes check a CSRF cookie/header. Logout bumps `tokenVersion`.
