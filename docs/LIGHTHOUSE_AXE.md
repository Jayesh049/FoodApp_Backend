# Lighthouse + axe (one-pager)

## Automated (axe via Playwright)

```bash
# FE :3001 + BE :3000
cd foodAppFrontend
npx playwright test e2e/a11y-axe.spec.js
```

Latest: **3/3 passed** (Home, All Plans, Login) — no critical/serious WCAG 2 A/AA violations after fixes (suggestion chips role, contact select label, login nested links, Dish Cinema thumb names).

## Lighthouse (Chrome DevTools)

1. Open `http://localhost:3001/` and `/allPlans` in incognito.
2. DevTools → Lighthouse → Analyze.
3. Paste scores below.

| Page | Perf | A11y | BP | SEO | Date | Notes |
|------|------|------|----|-----|------|-------|
| `/` | 97 | 94 | 100 | 100 | 2026-10-02 | Desktop preset, local production build |
| `/allPlans` | 94 | 96 | 100 | 100 | 2026-10-02 | Desktop preset, local production build |
| `/login` | — | — | — | — | — | Not in this run |

## Known constraints
- Scores are desktop Lighthouse against the local production preview, with the API on port 3000.
- Razorpay script only on checkout.
