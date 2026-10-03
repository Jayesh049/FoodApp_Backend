# What I built vs template

Honest scope for reviewers. Linked from the top of each README.

## Started from
- Create React App frontend shell (later moved to Vite)
- Custom Express + Mongo learning/API codebase (bookings, plans, auth)
- Genrich restaurant UI assets as a visual base

## Substantially built / redesigned
- Veg-focused plans UX (PhotoHero, Dish Cinema/Story, Plans/Contact/Suggestions)
- Auth hardening: bcrypt, env-only secrets, httpOnly cookies, CSRF, CORS allowlist, Helmet
- Authz: booking/user/delivery ownership and admin gates
- Payments: server-side pricing, Razorpay HMAC + webhook + idempotent confirm + reconcile; optional Stripe
- RAG suggestions (Ollama + Atlas vector index) with name-search fallback
- TypeScript frontend (`allowJs: false`), React Router v6, lazy routes
- HTTP integration tests (supertest + mongodb-memory-server), Playwright E2E
- OpenAPI at `/api/docs`, Docker Compose (API + Mongo + seed)
- Portfolio packaging: threat model, payments doc, Lighthouse/axe sheet, CI workflows

## Still deferred / not claiming
- Formal third-party security audit
- Production multi-tenant SaaS scale
- Buy→pay GIF on the README (optional; screenshots cover the first screen)
- “$200k offer guaranteed by this repo alone”
