# GitHub presentation checklist (Phase 4)

In-repo README badges and screenshots are ready. These settings are on GitHub itself and need a signed-in owner (no token was available in this environment).

## FoodApp_Backend

- **Description:** `Express API for vegetarian meal plans — server-priced Razorpay checkout, httpOnly JWT, CSRF, webhook + reconcile.`
- **Homepage:** `https://foodapp-frontend-z1zg.onrender.com`
- **Topics:** `nodejs`, `express`, `mongodb`, `react`, `razorpay`, `jwt`, `rag`
- **Where:** repo → ⚙️ → General → Description / Website / Topics

## FoodApp_Frontend

- **Description:** `React (Vite) vegetarian meal-plan UI — live demo with server-priced checkout and httpOnly session cookies.`
- **Homepage:** `https://foodapp-frontend-z1zg.onrender.com`
- **Topics:** `nodejs`, `express`, `mongodb`, `react`, `razorpay`, `jwt`, `rag`
- **Where:** repo → ⚙️ → General → Description / Website / Topics

## Profile pin

1. Open your GitHub profile → Customize your pins.
2. Pin **FoodApp_Backend** and **FoodApp_Frontend**.

Old Netlify homepage (`eatfitfoodapp.netlify.app`) should be replaced with the Render live URL above.

## After first push of CI workflows

Badges on each README point at `actions/workflows/ci.yml`. They turn green once the new workflow runs on `main`/`master`.
