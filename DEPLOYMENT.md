# Attendly — Production Deployment Guide

This guide walks you through deploying the **Attendly** workforce attendance and payroll PWA to production using:
- **Neon PostgreSQL** for serverless database hosting
- **Render Web Service** for the FastAPI backend
- **Render Static Site** for the React + Vite frontend

---

## Architecture Overview

```
┌──────────────────────────────────────┐       ┌─────────────────────────────────────┐
│  Render Static Site (Frontend)       │       │  Render Web Service (Backend)       │
│  - Root Dir: frontend                │ HTTP  │  - Root Dir: backend                │
│  - Build: npm install && npm build   ├──────►│  - Build: pip install -r reqs.txt   │
│  - Publish: dist                     │ (CORS)│  - Start: uvicorn app.main:app      │
│  - PWA: Manifest + Service Worker    │       │  - Port: $PORT, Host: 0.0.0.0       │
└──────────────────────────────────────┘       └──────────────────┬──────────────────┘
                                                                  │
                                                                  │ SSL Connection
                                                                  ▼
                                               ┌─────────────────────────────────────┐
                                               │  Neon PostgreSQL Database           │
                                               │  - Pooled Connection String         │
                                               │  - Auto-reconnect & pre-ping        │
                                               └─────────────────────────────────────┘
```

---

## Step 1: Initialize Git and Push to GitHub

From your project root (`Attendly`):

```bash
# Initialize git if not already initialized
git init

# Verify .gitignore is recognized (it excludes .env, node_modules, and venv)
git status

# Stage all files
git add .

# Create initial commit
git commit -m "feat: production deployment setup for Render and Neon"

# Create a new repository on GitHub (e.g. dad-attendance-pwa)
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/dad-attendance-pwa.git
git branch -M main
git push -u origin main
```

> [!IMPORTANT]
> The `.gitignore` file is configured to strictly exclude `.env`, `venv/`, and `node_modules/`. Real database credentials and tokens will **never** be committed to GitHub.

---

## Step 2: Create a Neon PostgreSQL Database

1. Go to [Neon Console](https://console.neon.tech/) and sign in.
2. Click **Create Project**:
   - **Project name**: `contractor-attendance` (or any name you prefer)
   - **Database name**: `neondb` (default)
   - **Region**: Choose the region closest to your users (e.g., `Asia Pacific (Mumbai)` or `AWS US East`).
3. Once created, in the **Dashboard**:
   - Locate the **Connection Details** panel.
   - Choose **Connection string** and check **Pooled connection** (recommended for serverless).
   - The connection string will look like:
     ```text
     postgresql://neondb_owner:npg_AbCdEfGh1234@ep-cool-river-a1b2c3d4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
   - Copy this connection string.

---

## Step 3: Deploy Backend on Render (Web Service)

1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository (`dad-attendance-pwa`).
4. Configure the Web Service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `dad-attendance-backend` (or your choice) |
| **Region** | Choose the same region or closest to Neon |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free (or Starter) |

5. Scroll down to **Environment Variables** and add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | *(Paste your Neon connection string from Step 2)* | Neon PostgreSQL connection |
| `JWT_SECRET` | *(Generate a 32+ character random string)* | Secret for signing JWT tokens |
| `ADMIN_MPIN` | `1234` *(or your custom 4-6 digit numeric PIN)* | MPIN your dad will enter to log in |
| `FRONTEND_URL` | `http://localhost:5173` *(temporary placeholder until Step 5)* | Allowed CORS origin |
| `PYTHON_VERSION` | `3.11.9` | Python runtime version |

> [!TIP]
> To generate a secure `JWT_SECRET`, run in your local terminal:
> ```bash
> openssl rand -hex 32
> ```

6. Click **Create Web Service**.
7. Render will build and deploy the backend.
8. Once deployment is marked **Live**:
   - Note your backend URL (e.g., `https://dad-attendance-backend.onrender.com`).
   - Test it by opening in your browser:
     - `https://dad-attendance-backend.onrender.com/health` (should return `{"status": "healthy"}`)
     - `https://dad-attendance-backend.onrender.com/docs` (interactive Swagger API docs)

---

## Step 4: Deploy Frontend on Render (Static Site)

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Static Site**.
2. Select your GitHub repository (`dad-attendance-pwa`).
3. Configure the Static Site settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `dad-attendance-frontend` (or your choice) |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Scroll to **Environment Variables** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://dad-attendance-backend.onrender.com` | Your live Render backend URL from Step 3 |

5. Click **Create Static Site**.
6. Render will run `npm install && npm run build` and publish the site.
7. Once finished, note your frontend URL (e.g., `https://dad-attendance-frontend.onrender.com`).

---

## Step 5: Update Backend CORS with Frontend URL

1. In Render, go back to your **Backend Web Service** (`dad-attendance-backend`).
2. Go to **Environment**.
3. Find `FRONTEND_URL` and update it to your actual frontend URL:
   ```text
   FRONTEND_URL=https://dad-attendance-frontend.onrender.com
   ```
4. Click **Save Changes**. Render will automatically redeploy the backend with the new CORS configuration.

---

## Step 6: Full Verification Checklist

1. **Verify Backend**:
   - Visit `https://dad-attendance-backend.onrender.com/health` &rarr; `{"status":"healthy"}`
   - Visit `https://dad-attendance-backend.onrender.com/docs` &rarr; Swagger UI renders cleanly.
2. **Verify Frontend & Authentication**:
   - Visit `https://dad-attendance-frontend.onrender.com` &rarr; Redirects to `/login`.
   - Enter your `ADMIN_MPIN` (e.g., `1234`) and tap **Login**.
   - Dashboard loads with metrics and site overview.
3. **Verify Routing & Refresh (404 Prevention)**:
   - Navigate to `https://dad-attendance-frontend.onrender.com/attendance`
   - Refresh the page &rarr; Should reload cleanly without 404 (handled by `_redirects`).
   - Navigate to `/payroll` and `/workers` and refresh each &rarr; Works smoothly.
4. **Verify Database Operations**:
   - Add a worker (e.g. "Ramesh", ₹800/day).
   - Add a work site (e.g. "Main Tower").
   - Mark attendance on `/attendance` and click **Save Attendance**.
   - Give an advance on `/advances` (e.g. ₹500).
   - Check `/payroll` &rarr; Net payable reflects ₹800 − ₹500 = ₹300.
   - In [Neon Console](https://console.neon.tech/), check the **Tables** tab &rarr; `workers`, `sites`, `attendance`, `advances`, `admin_settings` populated.
5. **Verify PWA Installation on Mobile (Android & iOS)**:
   - **Android (Chrome)**:
     - Open `https://dad-attendance-frontend.onrender.com`.
     - A banner or menu option **"Install app"** / **"Add to Home screen"** will appear.
     - Tap Install &rarr; Attendly appears as a standalone app with the Attendly icon on the home screen.
   - **iOS (Safari)**:
     - Open `https://dad-attendance-frontend.onrender.com` in Safari.
     - Tap the **Share** button (box with arrow pointing up).
     - Tap **"Add to Home Screen"**.
     - Attendly launches full-screen in standalone mode without browser URL bars.

---

## Render Blueprint Alternative (`render.yaml`)

If you prefer automated infrastructure as code, the repository includes a `render.yaml` file.

1. In Render, click **New +** > **Blueprint**.
2. Connect your repository.
3. Render will detect `render.yaml` and configure both the backend and frontend services.
4. Fill in the prompted values (`DATABASE_URL`, `ADMIN_MPIN`, etc.) and deploy.

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS error in browser console** | `FRONTEND_URL` on backend does not match frontend origin | Verify `FRONTEND_URL` in Render backend env matches your frontend domain exactly (no trailing slash). |
| **Database connection error** | Neon connection string format | Ensure the URL begins with `postgresql://` and includes `?sslmode=require`. The app automatically normalizes `postgres://`. |
| **Refreshing `/attendance` returns 404** | Static site rewrite missing | Ensure `frontend/public/_redirects` is in place. Vite copies it to `dist/_redirects` on build. |
| **Cold start delay** | Render free tier sleeps after 15 mins of inactivity | First request after sleep may take ~30-50 seconds to spin up. Subsequent requests are immediate. Upgrade to Render Starter plan for zero sleep if needed. |
| **PWA install prompt doesn't show** | Insecure HTTP connection or missing icon | Render serves over HTTPS automatically. Ensure `pwa-192x192.png`, `pwa-512x512.png`, and `manifest.json` are loaded. |
