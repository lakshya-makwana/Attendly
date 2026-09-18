# Attendly

> **Contractor Workforce Attendance, Advance Ledger & Payroll Progressive Web Application**

Attendly is a mobile-first, single-admin Progressive Web App (PWA) engineered specifically for construction and general contractors. It streamlines field crew roster management, variable shift attendance tracking, cash/UPI advances, site cost analytics, and monthly payroll calculation into an offline-capable, high-contrast digital ledger.

---

## Architecture Overview

Attendly runs in production on **Vercel** as a unified multi-service deployment connected directly to GitHub, backed by a serverless **PostgreSQL** database.

```text
GitHub (main branch)
       │
       ▼ (Automated Git Deployments)
Vercel (Production Platform)
   ├── Frontend Service: React 19 + Vite 8 + PWA (root: frontend/)
   │     • UI: Material UI + Tailwind CSS v4
   │     • Client Routing: React Router DOM 7
   │     • State & Network: Axios with JWT bearer interceptors
   │
   └── Backend Service: FastAPI 0.115 + Python (root: backend/)
         • Entrypoint: app.main:app
         • ORM: SQLAlchemy 2.0 (psycopg2-binary)
         • Unified Routing: /api/* rewritten internally via vercel.json
         │
         ▼ (Encrypted SSL Connection)
   PostgreSQL Database (Neon Serverless PostgreSQL)
         • Tables: workers, sites, attendance, advances, admin_settings
         • Startup schema initialization via SQLAlchemy Base metadata
```

---

## Problem Solved & Target User

### The Problem
Traditional construction contracting relies on physical paper diaries, fragmented WhatsApp messages, or generic spreadsheet templates. These methods suffer from:
- **Lost records & calculation errors** when tracking half-days, double-shifts, and overtime.
- **Disputed advance payouts** handed out on-site in cash without immediate ledger deduction.
- **Unclear site profitability** due to inability to attribute daily labor wages to specific project sites.
- **Complicated corporate HR software** requiring worker logins, GPS geofencing, or facial recognition—completely unsuited for real-world day-wage labor.

### The Target User
- **General Contractors & Project Leads**: Managing 5 to 50+ trade workers across active job sites.
- **Single-Admin Model**: The contractor holds the device and operates the app. Workers do **not** need user accounts, smartphone apps, OTPs, or passwords.

---

## Core Features & Workflows

| Module | Purpose | Key Functionality |
| :--- | :--- | :--- |
| **Dashboard / Overview** | Daily Command Center | Real-time headcount (marked vs unmarked), active sites, MTD gross earnings, advances disbursed, and net payable. |
| **Attendance Muster** | Rapid Daily Check-In | Date switcher, site assignment, granular work-unit buttons (`0`, `0.5`, `1.0`, `1.5`, `2.0`), batch actions ("All Present", "Reset"), and instant wage computation. |
| **Worker Management** | Crew Registry & Ledger | Worker profiles, daily wage rates, active/inactive toggle, phone call action, wage edit modal, and complete attendance/advance history. |
| **Site Management** | Project Tracking | Construction site registry, site status toggles, and deletion protection against sites with historical records. |
| **Advance Ledger** | Instant Payouts | Record cash or UPI advances with date and notes; immediate balance recalculation and deduplication. |
| **Payroll Settlement** | End-of-Cycle Disbursals | Cumulative monthly payroll ledger, worker wage slips, advance deductions, and manual cycle settlement without automatic calendar month resets. |
| **Site Analytics** | Cost Intelligence | Monthly labor expenditure breakdown per site, unique worker counts, and day-by-day cost auditing. |

---

## Technology Stack

### Frontend
- **Framework**: React 19 (`^19.2.8`) + Vite 8 (`^8.3.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` 4.3.3) + Material UI 9 (`@mui/material`, `@emotion/react`, `@emotion/styled`)
- **Icons**: Google Material Symbols Outlined + `@mui/icons-material`
- **Typography**: Inter (body & UI) + Space Grotesk (numerical data & landmarks)
- **Routing**: React Router DOM 7 (`^7.18.3`)
- **HTTP Client**: Axios 1.20 with request/response interceptors for JWT
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)

### Backend
- **Framework**: FastAPI 0.115.0
- **ASGI Server**: Uvicorn 0.30.6
- **Database Engine**: SQLAlchemy 2.0.35 + PostgreSQL (`psycopg2-binary >= 2.9.10`)
- **Validation**: Pydantic 2.9.2 + `pydantic-settings`
- **Security**: Python-JOSE (JWT HS256) + Passlib / Bcrypt for MPIN hashing
- **Configuration**: `python-dotenv`

### Cloud Infrastructure
- **Hosting**: Vercel (multi-service configuration via `vercel.json`)
- **Database**: PostgreSQL (Neon Serverless PostgreSQL with SSL)
- **Continuous Integration**: Automated Vercel deployments on GitHub `main` push

---

## Important Business Rules

### 1. Granular Work-Unit Values
Attendly models labor shifts using exact numeric units validated at both client and API schemas:
- `0.0`: Absent / Off-Duty (Zero wage earned).
- `0.5`: Half Day (e.g. morning shift or early departure).
- `1.0`: Full Standard Shift (8 hours).
- `1.5`: Overtime / Extended Shift (1.5x daily wage).
- `2.0`: Double Shift (2.0x daily wage).

$$\text{Gross Wage for Entry} = \text{Work Units} \times \text{Worker Daily Wage}$$

### 2. Manual Payroll Settlement (No Calendar Resets)
- **Rule**: Attendly does **not** automatically reset payroll on the 1st of every calendar month.
- **Contractor-Controlled**: A payroll cycle runs continuously until the contractor physically pays the workers and clicks **"Settle & Start New Cycle"** (e.g., September 11 &rarr; October 10).
- **Historical Retention**: Settlement archives the period totals without deleting workers, sites, attendance entries, or advance records.

$$\text{Net Payable Due} = \sum (\text{Gross Labour}) - \sum (\text{Advances Disbursed})$$

### 3. Deactivation vs. Deletion
- **Workers**: Inactive workers are hidden from daily attendance muster rolls, but their past attendance logs and advance history remain permanently accessible in financial statements.
- **Sites**: A site with associated historical attendance records cannot be deleted (`HTTP 400`). Contractors deactivate the site instead, keeping historical cost analytics accurate.

### 4. Duplicate Prevention
A database-level unique constraint (`uq_worker_attendance_date`) prevents recording duplicate attendance entries for the same worker on the same date. Saving attendance updates existing records in place.

---

## Authentication & Security

- **Admin-Only**: Attendly is a dedicated single-tenant contractor tool. There are no worker portals, supervisor roles, or public user registrations.
- **6-Digit MPIN**: Access is protected by a numeric MPIN (default `1234`, customizable in settings).
- **Cryptographic Hashing**: The MPIN is hashed using Passlib `bcrypt` and stored in the `admin_settings` table.
- **JWT Sessions**: Successful login issues a signed JSON Web Token (HS256) stored in client `localStorage` with a 30-day expiration window.
- **Protected Routing**: Both client React Router guards (`ProtectedRoute`) and FastAPI dependency injection (`Depends(get_current_admin)`) reject unauthenticated requests.
- **Data Safety**: No secrets or live production credentials are committed to version control (`.gitignore` enforces exclusions).

---

## Repository Structure

```text
Attendly/
├── .env.example              # Full-stack environment variable template
├── .gitignore                # Excludes secrets, node_modules, and venv
├── DEPLOYMENT.md             # Production Vercel deployment guide
├── API.md                    # REST API endpoint specification
├── DATABASE.md               # PostgreSQL schema & relationship documentation
├── vercel.json               # Multi-service Vercel routing configuration
├── backend/                  # FastAPI Application
│   ├── .env.example          # Backend environment variable template
│   ├── requirements.txt      # Python dependencies
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, lifespan & CORS
│   │   ├── core/             # Configuration, database engine & security
│   │   ├── models/           # SQLAlchemy models (Worker, Site, Attendance, etc.)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── api/              # Route controllers (auth, attendance, payroll, etc.)
│   └── scripts/              # Migration & testing utilities
└── frontend/                 # React + Vite PWA Application
    ├── .env.example          # Frontend environment variable template
    ├── package.json          # Node dependencies & build scripts
    ├── vite.config.js        # Vite config with local /api proxy & Tailwind v4
    ├── index.html            # PWA entrypoint HTML
    ├── public/
    │   ├── manifest.json     # PWA Web App Manifest
    │   ├── sw.js             # Service Worker for offline caching
    │   └── *.png, *.svg      # PWA app icons (192x192, 512x512, maskable)
    └── src/
        ├── main.jsx          # Client bootstrap & SW registration
        ├── App.jsx           # App layout & client route configuration
        ├── api/client.js     # Axios instance with baseURL & JWT interceptor
        ├── pages/            # Page views (Dashboard, Attendance, Payroll, etc.)
        └── theme.js          # Material UI custom theme configuration
```

---

## Local Development Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node 20+)
- **Python**: v3.11+
- **PostgreSQL**: Local PostgreSQL 14+ running on port 5432 (or an isolated test database)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/lakshya-makwana/Attendly.git
cd Attendly

# Create backend .env from template
cp backend/.env.example backend/.env
```

> [!CAUTION]
> Never put live production database credentials into your local `.env`. Ensure your local `backend/.env` points to a local database such as `postgresql://localhost:5432/contractor_db`.

### 2. Run Backend
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI development server on port 8001
uvicorn app.main:app --reload --port 8001
```

Backend endpoints will be available at:
- **API Base**: `http://localhost:8001`
- **Swagger UI**: `http://localhost:8001/docs`
- **Health Check**: `http://localhost:8001/health`

### 3. Run Frontend
In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- Vite dev server runs on `http://localhost:5174` (or `http://localhost:5173`).
- All requests to `/api/*` are automatically proxied to `http://localhost:8001` by `vite.config.js`.

---

## Testing & Quality Assurance

```bash
# Run frontend linter (Oxlint)
cd frontend
npm run lint

# Run production build test
npm run build
```

---

## Documentation Index

- [DEPLOYMENT.md](file:///Users/lakshya/Documents/Attendly/DEPLOYMENT.md): Complete guide to production Vercel setup, environment variables, continuous integration, and mobile PWA installation.
- [API.md](file:///Users/lakshya/Documents/Attendly/API.md): Detailed REST API reference covering all endpoints, parameters, authentication requirements, and response schemas.
- [DATABASE.md](file:///Users/lakshya/Documents/Attendly/DATABASE.md): Comprehensive PostgreSQL schema documentation, relationships, constraints, and data preservation principles.

---

## License

Private repository. Copyright &copy; 2026 Lakshya Makwana. All rights reserved.
