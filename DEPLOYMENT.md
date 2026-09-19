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
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` | Pooled PostgreSQL connection string with SSL. |
| `JWT_SECRET` | **Yes** | `f9c2d1b8...` (32+ character random hex string) | Cryptographic key used to sign and verify admin session JWTs. |
| `ADMIN_MPIN` | Optional | `1234` | Cold-start seed fallback only if `admin_settings` is completely empty. Not used for normal login verification (MPIN is verified against PostgreSQL hash). |
| `FRONTEND_URL` | Optional | `https://your-domain.vercel.app` | Comma-separated allowed CORS origins (used when accessing API from external domains). |
| `ENVIRONMENT` | Optional | `production` | Environment flag (`production` or `development`). |

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
3. **Authentication**: Open `https://<your-vercel-domain>/login` &rarr; enter your configured `ADMIN_MPIN` &rarr; dashboard loads.
4. **Client-Side Refresh**: Navigate to `/attendance` and `/payroll` &rarr; press browser reload &rarr; confirm no 404 error occurs.
5. **Data Flow**: Add a test worker or check-in &rarr; verify instantaneous update and ledger persistence.

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
