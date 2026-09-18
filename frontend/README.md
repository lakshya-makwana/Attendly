# Attendly — Frontend Application

This directory contains the **React 19 + Vite 8** mobile-first Progressive Web Application (PWA) for Attendly.

---

## Technology Stack

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Material UI 9 (`@mui/material`, `@emotion/react`, `@emotion/styled`)
- **Routing**: React Router DOM 7 (`react-router-dom`)
- **API Client**: Axios 1.20 (`axios`)
- **Linting**: Oxlint (`oxlint`)
- **PWA**: Service Worker (`public/sw.js`) and Web App Manifest (`public/manifest.json`)

---

## Directory Structure

```text
frontend/
├── public/
│   ├── manifest.json       # PWA manifest metadata
│   ├── sw.js               # Service Worker for offline asset caching
│   ├── _redirects          # SPA fallback routing rule
│   └── *.png, *.svg        # App icons (192px, 512px, maskable, apple-touch)
├── src/
│   ├── main.jsx            # React root mount and production SW registration
│   ├── App.jsx             # Route definitions and AuthProvider wrapping
│   ├── index.css           # Tailwind CSS directives and global typography
│   ├── theme.js            # Custom Material UI theme tokens
│   ├── api/
│   │   └── client.js       # Axios client with JWT interceptor and baseURL logic
│   ├── context/
│   │   └── AuthContext.jsx # Admin authentication context and session state
│   ├── components/
│   │   ├── AppLayout.jsx   # Shell with top app bar and bottom navigation
│   │   └── ...             # Reusable UI widgets
│   ├── pages/
│   │   ├── Login.jsx       # 6-Digit MPIN authentication screen
│   │   ├── Dashboard.jsx   # Overview metrics and quick actions
│   │   ├── Attendance.jsx  # Daily attendance muster with work-unit buttons
│   │   ├── Workers.jsx     # Worker registry and management
│   │   ├── WorkerDetail.jsx# Detailed worker ledger, wages, and advances
│   │   ├── Sites.jsx       # Project site management
│   │   ├── Advances.jsx    # Advance payment entry ledger
│   │   ├── Payroll.jsx     # Monthly payroll ledger and wage slips
│   │   └── SiteAnalytics.jsx # Site labor expense breakdown
│   └── utils/              # Formatting helpers (currency, date, numbers)
├── vite.config.js          # Vite config with local proxy to backend on port 8001
└── package.json            # Scripts and dependencies
```

---

## Available Scripts

From this directory (`frontend/`):

```bash
# Start local development server (runs on port 5174/5173 with /api proxy)
npm run dev

# Run Oxlint for fast code analysis
npm run lint

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## PWA Capabilities

- **Standalone Mode**: Runs without browser chrome on Android and iOS devices.
- **Service Worker**: Caches essential HTML, CSS, JavaScript, and fonts for immediate launch.
- **Auto HTTPS**: Enforced in production by Vercel for secure service worker scope.
