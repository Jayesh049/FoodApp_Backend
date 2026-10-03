# Deploy guide

Use **root** `Backend/` + `foodAppFrontend/` only.

## Env (host secrets — never in git)

Backend service needs at least:

```text
NODE_ENV=production
PORT=3000
DB_LINK=
JWTSECRET=
FRONTEND_URL=https://foodapp-frontend-z1zg.onrender.com
ADMIN_EMAIL=
ADMIN_PASSWORD=
APP_EMAIL=
APP_PASSWORD=
KEY_ID=
KEY_SECRET=
```

Frontend build:

```text
VITE_API_ORIGIN=https://foodapp-backend-joksepha.onrender.com
```

Optional error tracking. Create a free Sentry project, then set the DSN only on the host:

```text
SENTRY_DSN=
VITE_SENTRY_DSN=
```

`VITE_SENTRY_DSN` is baked in at frontend build time, so the frontend has to be rebuilt after it is set. With both values empty, the app does not send errors anywhere.

Live app: https://foodapp-frontend-z1zg.onrender.com

Optional demo login (set on the API, then redeploy):

```text
DEMO_EMAIL=
DEMO_PASSWORD=
```

The login page button calls `POST /api/v1/auth/demo`. It only works after those env values exist and the API has been redeployed with this route. On the split Render hosts, set `COOKIE_SAME_SITE=none` so the browser keeps the login cookie.

## Rotate the old Atlas password

An early commit stored an Atlas URI. Current code does not. In the Atlas console, change that database user's password and put the new URI only in Render `DB_LINK`. Do not rewrite git history.

## Recommended split

| Piece | Example hosts |
|-------|----------------|
| API | [Render](https://render.com) Web Service, Railway, Fly.io |
| MongoDB | MongoDB Atlas |
| Frontend static | Render Static Site, Netlify, Cloudflare Pages, Vercel |

### Backend (Render-style)

1. New **Web Service**, root dir `Backend`, build `npm install`, start `npm start`.
2. Add env vars from `.env.example`.
3. Health check path: `/health`.
4. After first deploy, confirm `GET /health` and `GET /health/ready`.
5. Interactive OpenAPI docs: `GET /api/docs` (raw JSON at `/api/docs.json`).

### Frontend

1. Build command: `cd foodAppFrontend && npm ci && npm run build`
2. Publish dir: `foodAppFrontend/build`
3. Set `VITE_API_ORIGIN` to the public API URL.
4. Ensure Backend `FRONTEND_URL` matches the exact frontend origin (CORS + cookies).

Build command example:

```bash
cd foodAppFrontend && npm ci && npm run build
```

Publish dir: `foodAppFrontend/build`

## Checklist before sharing the demo URL

- [ ] Rotated any old leaked secrets
- [ ] Admin password is strong and only in host env
- [ ] Razorpay **test** keys for public demos (or disable checkout)
- [ ] Paste live URL into root `README.md` → Demo section
- [ ] Smoke: signup/login, plans list, admin blocked when logged out

## Local production-ish smoke

```bash
cd Backend && NODE_ENV=production npm start
cd foodAppFrontend && npm run build && npm run preview
```

## Docker Compose (API + Mongo + seed)

From the repo root (Docker Desktop or compatible Compose):

```bash
docker compose up --build
```

Order: Mongo becomes healthy → `seed` runs `node scripts/seed-plans.js` (creates a placeholder image if `uploads/` is empty) → `api` listens on port **3000**.

Optional overrides: copy [`.env.docker.example`](../.env.docker.example) to `.env` beside `docker-compose.yml`. Defaults are local-only (`admin@foodapp.local` / `demo@foodapp.local`). Do not use those passwords on Render or Atlas.

Smoke:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/plan/
```
