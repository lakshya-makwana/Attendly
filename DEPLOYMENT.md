# Attendly — Production Deployment Guide

This guide documents the current production architecture and deployment process for **Attendly**, a progressive web application (PWA) for contractor workforce attendance, site tracking, advances, and payroll management.

---

## Current Production Architecture

Attendly is deployed and hosted on **Vercel** as a unified multi-service project linked to GitHub.

```text
GitHub (main branch)
       │
       ▼ (Automatic Git Deployments)
Vercel (Production Environment)
   ├── Frontend Service: React + Vite + PWA (root: frontend/)
   │     • Build: npm run build
   │     • Output: dist/
   │     • Routing: Vercel SPA rewrites to index.html
   │
   └── Backend Service: FastAPI + Python (root: backend/)
         • Entrypoint: app.main:app
         • API Routes: /api/* (routed via vercel.json)
         │
         ▼ (Encrypted SSL Connection)
   PostgreSQL Database (Neon Serverless PostgreSQL)
         • Tables: workers, sites, attendance, advances, admin_settings
         • Automatic schema synchronization on startup
```

---

## Service Configuration (`vercel.json`)

Vercel manages both the frontend and backend using the root [`vercel.json`](file:///Users/lakshya/Documents/Attendly/vercel.json) configuration:

```json
{
  "services": {
    "frontend": {
      "root": "frontend/",
      "framework": "vite"
    },
    "backend": {
      "root": "backend/",
      "entrypoint": "app.main:app"
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": {
        "service": "backend"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "frontend"
      }
    }
  ]
}
```

### Key Architectural Benefits:
1. **Unified Domain**: Both the frontend application and backend API share the same Vercel production domain.
2. **Zero CORS Friction**: Because `/api/*` is rewritten internally to the backend service, requests from the frontend are same-origin, eliminating cross-origin browser issues.
3. **Automated Continuous Delivery**: Every commit pushed to GitHub's `main` branch triggers an automated Vercel deployment of both services.

---

## 1. Frontend Deployment

- **Technology Stack**: React 19, Vite 8, Tailwind CSS v4, Material UI.
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (executes `vite build`)
- **Publish / Output Directory**: `dist`
- **Client Entry Point**: `src/main.jsx`
- **Routing**: `react-router-dom` with client-side routes:
  - `/` (Redirects to `/dashboard`)
  - `/login` (Admin 6-digit MPIN authentication)
  - `/dashboard` (Operational metrics, MTD payroll summary, active sites)
  - `/attendance` (Daily shift muster roll with 0, 0.5, 1, 1.5, 2 unit logging)
  - `/workers` (Worker registry, rate management, attendance/advance records)
  - `/workers/:id` (Worker detailed ledger)
  - `/sites` (Construction project sites management)
  - `/advances` (Advance payout entries and ledger history)
  - `/payroll` (Monthly payroll calculation, worker slips, settlement workflow)

---

## 2. Backend Deployment

- **Technology Stack**: FastAPI 0.115.0, Uvicorn, Python 3.11+, SQLAlchemy 2.0.35, psycopg2-binary.
- **Root Directory**: `backend`
- **Entrypoint**: `app.main:app`
- **Dependencies**: Listed in `backend/requirements.txt`.
- **Database Initialization**: The backend automatically ensures database tables exist upon server startup inside FastAPI's async lifespan handler (`Base.metadata.create_all(bind=engine)`).
- **Interactive Documentation**: Available at `/docs` (Swagger UI) and `/redoc` on your Vercel domain.
- **Health Check Endpoint**: Available at `/health` (returns `{"status": "healthy"}`).

---

## 3. Environment Variables

Environment variables are configured in the **Vercel Project Settings** under **Settings > Environment Variables**.

### Backend Service Variables:

| Variable Name | Required | Example / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` | Pooled PostgreSQL connection string with SSL. The app refuses to start without it. |
| `JWT_SECRET` | **Yes** | output of `openssl rand -hex 32` | Signs admin session JWTs. Must be non-empty and must not be the old published default, or the app refuses to start. `SECRET_KEY` is accepted as a fallback name; do not set `JWT_SECRET` to an empty string. |
| `ADMIN_MPIN` | Optional | 4–6 digits | Only bootstraps the admin account on an empty database. There is no default. If set, it must be 4–6 digits (an empty value is rejected); leave it unset once the account exists. |
| `FRONTEND_URL` | Optional | `https://your-domain.vercel.app` | Comma-separated allowed CORS origins (used when accessing API from external domains). |
| `ENVIRONMENT` | Optional | `production` | Off Vercel only. On Vercel the environment is taken from the system variable `VERCEL_ENV`. |
| `PRODUCTION_DATABASE_HOSTS` | Optional | `ep-still-queen` | Extra comma-separated host markers that only the production deployment may use (the production Neon endpoint is built in). |
| `LOGIN_*` | Optional | see `backend/app/core/config.py` | MPIN lockout tuning. Defaults: first lock after 10 (account) / 5 (client or trusted device) failures for 15 min; then every 3 failures doubles it up to 24 h; resets after 24 quiet hours. |

`VERCEL` and `VERCEL_ENV` are set by Vercel automatically. Never set `ALLOW_REMOTE_DATABASE` on Vercel.

### Environment isolation (Production / Preview / Development)

Vercel scopes every variable to **Production**, **Preview** and/or **Development**. A variable added with the default checkboxes applies to **all three**, which would give every Preview deployment the production database and the production JWT secret. Preview code is whatever is on a branch, so anything available to Preview is available to anyone who can push a branch.

| Variable | Production | Preview | Development |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production Neon (pooled) | **Separate** database (see below) | Local PostgreSQL, or unset |
| `JWT_SECRET` | Secret A | **Different** secret B | Unset (random per process) or secret C |
| `ADMIN_MPIN` | Unset | Optional (bootstraps the empty preview DB) | Optional |
| `FRONTEND_URL` | Production domain | Optional | Unset |
| `ENVIRONMENT` | Optional (`production`) | **Do not set** | **Do not set** |

Distinct JWT secrets matter as much as distinct databases: with a shared secret, a token signed by a preview deployment would be a valid signature in production.

**Configure in the Vercel dashboard** (Project → Settings → Environment Variables):
1. Edit `DATABASE_URL` and `JWT_SECRET` (and `SECRET_KEY` if present) and leave **only Production** ticked.
2. Add a Preview-scoped `DATABASE_URL` for the preview database and a Preview-scoped `JWT_SECRET` generated with `openssl rand -hex 32`.
3. Project → Settings → Deployment Protection: enable **Vercel Authentication** for Preview deployments so previews are not public.
4. Until a preview database exists, either do not push other branches or skip preview builds (Project → Settings → Git → Ignored Build Step).

**Preview database options**:
- **Separate Neon project** (recommended): fully isolated, contains no production data. Tables are created by the app on first start; then apply `backend/scripts/migrate_auth_security.sql` and bootstrap with a Preview-scoped `ADMIN_MPIN` or `backend/scripts/seed_data.py`.
- **Neon branch of production**: writes never reach production, and the branch has its own `ep-…` host, so the guard below allows it. But it contains a **copy of production data** (worker names, phone numbers, wages); treat it as production-sensitive.

**Guard in code** (`backend/app/core/config.py`): any database host matching the production Neon endpoint is refused unless the deployment environment is production. On Vercel that is decided only by the system variable `VERCEL_ENV`; if it is missing the app fails closed. A Preview that inherits the production `DATABASE_URL` therefore refuses to start instead of connecting. The startup log shows which environment connected where, for example `[DATABASE SAFETY] Connected to database target: <host> (deployment environment: preview)`.

> [!TIP]
> Generate a secure `JWT_SECRET` locally using:
> ```bash
> openssl rand -hex 32
> ```

### Frontend Service Variables:

| Variable Name | Required | Default if Omitted | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Optional | `""` (defaults to `/api`) | Base API URL. In production Vercel, omit this variable or leave blank so requests use relative `/api` paths routed seamlessly by Vercel. |

---

## 4. How Frontend Connects to Backend

1. The API client is configured in [`frontend/src/api/client.js`](file:///Users/lakshya/Documents/Attendly/frontend/src/api/client.js).
2. When `VITE_API_URL` is omitted, `getBaseUrl()` defaults to relative `/api`.
3. In production, Vercel's rewrite rule matches `/api/:path*` and forwards the request to the `backend` service.
4. The client automatically:
   - Attaches the contractor's JWT token via `Authorization: Bearer <token>` from `localStorage`.
   - Handles `401 Unauthorized` responses by clearing credentials and redirecting to `/login`.

---

## 5. GitHub → Vercel Deployment Workflow

1. **Connect Repository**:
   - The repository on GitHub is linked to the project in the [Vercel Dashboard](https://vercel.com).
2. **Branch Tracking**:
   - The `main` branch is designated as the Production branch.
3. **Automated Deployments**:
   - Pushing commits to `main` (`git push origin main`) immediately triggers a Vercel production build.
   - Pull Requests and other branches generate isolated Preview Deployments.
4. **Build Pipeline**:
   - Vercel installs Python dependencies from `backend/requirements.txt`.
   - Vercel installs Node dependencies from `frontend/package.json` and executes `npm run build`.
   - Vercel deploys the build artifact and provisions HTTP routes per `vercel.json`.

---

## 6. Production Build & Verification Checklist

Before pushing changes to `main`:

```bash
# 1. Verify frontend build passes locally
cd frontend
npm run lint
npm run build
cd ..

# 2. Verify git status is clean and secrets are not staged
git status
```

### Post-Deployment Verification Steps:
1. **Health Check**: Open `https://<your-vercel-domain>/health` &rarr; verify `{"status": "healthy"}`.
2. **API Documentation**: Open `https://<your-vercel-domain>/docs` &rarr; verify Swagger UI renders.
3. **Authentication**: Open `https://<your-vercel-domain>/login` &rarr; enter your MPIN &rarr; dashboard loads.
4. **Client-Side Refresh**: Navigate to `/attendance` and `/payroll` &rarr; press browser reload &rarr; confirm no 404 error occurs.
5. **Data Flow**: Add a test worker or check-in &rarr; verify instantaneous update and ledger persistence.

---

## 6a. Authentication Security Deployment (migration first)

The authentication security changes need schema objects that `create_all()` cannot add (it never alters existing tables). The new code selects `admin_settings.session_epoch` on every authenticated request, so **deploying before migrating breaks every API call**. The migration is additive and older code ignores it, so it is always safe to apply first.

**Schema changes** (`backend/scripts/migrate_auth_security.sql`, idempotent):
- New table `auth_login_attempts` (lockout counters, unique per account and scope).
- New table `auth_trusted_devices` (SHA-256 hashes of trusted-device tokens) with index `ix_auth_trusted_devices_account_id`.
- New column `admin_settings.session_epoch INTEGER NOT NULL DEFAULT 0`.

**Sequence**:
1. Check Production variables in Vercel (section 3): `DATABASE_URL`, non-empty `JWT_SECRET`, and `ADMIN_MPIN` unset or 4–6 digits.
2. Back up production: `pg_dump "$DATABASE_URL" --no-owner --format=custom -f attendly_pre_auth_security.dump` (backups are git-ignored).
3. Load the production URL without writing it to shell history: `read -rs DATABASE_URL && export DATABASE_URL`.
4. Check what is missing: `backend/venv/bin/python backend/scripts/migrate_auth_security.py --confirm-host <production host> --verify-only`.
5. Apply: `backend/venv/bin/python backend/scripts/migrate_auth_security.py --confirm-host <production host>` (or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f backend/scripts/migrate_auth_security.sql`). Re-run `--verify-only` and expect "Verification passed".
6. `unset DATABASE_URL`, then push `main` (Vercel deploys Production).
7. Smoke test: `/api/health`; an already logged-in browser still works; MPIN login works; one wrong MPIN returns 401; the login response contains `device_token`; the function log shows `deployment environment: production`.

**Compatibility**:
- Existing sessions stay valid: they carry no session epoch and count as epoch 0, which every account starts at. The first MPIN change, or `admin_recovery.py revoke-sessions` / `reset-mpin`, revokes them along with every other earlier session.
- Changing `JWT_SECRET` logs everyone out once and resets per-client lockout counters (they are keyed with the secret). Trusted devices stay trusted.

**Rollback**:
- Vercel → Deployments → previous production deployment → **Instant Rollback** (no rebuild), or `git revert` the commits and push.
- Leave the schema in place: the previous code ignores the new tables and column, and tokens issued by the new code carry extra claims that the previous code ignores, so nobody is logged out by a rollback.
- Only if the schema must be removed after rolling back the code: `DROP TABLE IF EXISTS auth_trusted_devices; DROP TABLE IF EXISTS auth_login_attempts; ALTER TABLE admin_settings DROP COLUMN IF EXISTS session_epoch;`

### Admin recovery (locked out, lost MPIN, suspected compromise)

Needs the database credentials, so it works when every login path is locked. Load `DATABASE_URL` as in step 3 above, then:

```bash
backend/venv/bin/python backend/scripts/admin_recovery.py --confirm-host <host> status           # read-only
backend/venv/bin/python backend/scripts/admin_recovery.py --confirm-host <host> unlock           # clear lockouts
backend/venv/bin/python backend/scripts/admin_recovery.py --confirm-host <host> revoke-sessions  # log out everywhere
backend/venv/bin/python backend/scripts/admin_recovery.py --confirm-host <host> reset-mpin       # prompts for the new MPIN
```

A browser that has logged in before is a trusted device: it keeps logging in while others' failed guesses hold the account-wide lockout, so `unlock` is only needed for new browsers.

---

## 7. Local Development Setup

To run the application locally on your computer:

### Step 1: Start Backend
```bash
cd backend

# Create virtual environment if not present
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server on port 8001
uvicorn app.main:app --reload --port 8001
```

### Step 2: Start Frontend
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (runs on port 5174 or 5173)
npm run dev
```

> [!NOTE]
> During local development, [`frontend/vite.config.js`](file:///Users/lakshya/Documents/Attendly/frontend/vite.config.js) proxies `/api` requests directly to `http://localhost:8001`.

---

## 8. Safe Local Testing & Data Protection

> [!CAUTION]
> **PROTECT PRODUCTION DATA AT ALL TIMES**
> 
> Never allow local development or test suites to connect directly to the live production database.

Follow these strict safety rules:
1. **Local Database Only**:
   - For local development and testing, use a local PostgreSQL database (e.g. `postgresql://localhost:5432/contractor_db`) or an isolated test database.
   - Verify `DATABASE_URL` in `backend/.env` before launching local services.
2. **Never Seed or Reset Production**:
   - Do not run migration scripts, table drops, or seed scripts (`backend/scripts/seed.py`) against production URLs.
3. **Protect Environment Secrets**:
   - `.env` files are ignored in `.gitignore`. Never commit real credentials, database strings, or tokens to GitHub.
4. **Zero Live Deployment During Tests**:
   - Do not push experimental or unverified commits to `main`.

---

## 9. PWA (Progressive Web App) Deployment

Attendly is engineered as an offline-capable, standalone mobile Progressive Web App.

### PWA Components:
- **Web App Manifest**: [`frontend/public/manifest.json`](file:///Users/lakshya/Documents/Attendly/frontend/public/manifest.json) defines app name (`Attendly`), theme color (`#0F172A`), background color (`#FFFFFF`), display mode (`standalone`), and app icons.
- **Service Worker**: [`frontend/public/sw.js`](file:///Users/lakshya/Documents/Attendly/frontend/public/sw.js) caches core static assets for offline performance. Registered in `frontend/src/main.jsx` for all production builds (`!import.meta.env.DEV`).
- **Icons**:
  - `pwa-192x192.png`, `icon-192.png`, `icon-maskable-192.png`
  - `pwa-512x512.png`, `icon-512.png`, `icon-maskable-512.png`
  - `apple-touch-icon.png` (for iOS Safari home screen)
- **HTTPS Enforcement**: Vercel automatically secures all traffic with SSL certificates, which is an absolute requirement for browsers to enable Service Workers and PWA installation.

### Mobile Installation Instructions:
- **Android (Chrome)**:
  1. Navigate to the Attendly Vercel URL in Chrome.
  2. Tap the browser menu (three dots) or the **"Install Attendly"** banner.
  3. The app is installed directly to the home screen and launches without browser address bars.
- **iOS (Safari)**:
  1. Open the Attendly URL in Safari.
  2. Tap the **Share** button (box with an upward arrow).
  3. Scroll down and select **"Add to Home Screen"**.
  4. Confirm the name **Attendly** and tap **Add**.

---

## 10. Automatic Monthly Payroll Reset

Attendly uses a calendar-month payroll model designed specifically for field labor accounting:
- **Automatic Calendar Month Reset**: Payroll calculations run from the 1st through the last day of each calendar month. When a new month begins, payroll metrics automatically start from ₹0.
- **Permanent Historical Preservation**: Past calendar months remain permanently selectable and fully detailed in the Payroll History ledger.
- **Zero Data Loss**: Monthly resets are non-destructive; all underlying attendance logs, advance records, worker wage histories, and site links remain permanently intact.

---

## Troubleshooting Common Issues

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **API returns 404 on Vercel** | Missing rewrite rule or path mismatch | Verify `vercel.json` contains `"source": "/api/:path*", "destination": { "service": "backend" }`. |
| **Database connection failure** | Malformed connection string or SSL mismatch | Verify `DATABASE_URL` in Vercel backend environment variables begins with `postgresql://` and includes `?sslmode=require`. |
| **Refreshing client pages returns 404** | Client-side routing not rewritten to `index.html` | Ensure `vercel.json` includes `"source": "/(.*)", "destination": { "service": "frontend" }`. |
| **PWA Install banner doesn't appear** | Non-HTTPS connection or cached manifest | Vercel provides HTTPS automatically. Ensure icons in `public/manifest.json` resolve with HTTP 200. |
| **Session expires unexpectedly** | Invalid or rotated `JWT_SECRET` | Ensure `JWT_SECRET` is set consistently across Vercel deployments. |
