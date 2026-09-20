import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine, Base
from .core.config import settings
from .api import auth, workers, sites, attendance, advances, payroll, dashboard, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist on startup (handles first-time Neon initialization)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database initialization warning: {e}")
    yield

app = FastAPI(
    title="Attendly API",
    description="Dedicated single-admin API for Attendly workforce attendance, advances, and payroll management.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Parse allowed origins for CORS (safe for allow_credentials=True)
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_env = os.getenv("FRONTEND_URL") or settings.FRONTEND_URL
if frontend_env:
    for url in frontend_env.split(","):
        cleaned = url.strip().rstrip("/")
        if cleaned and cleaned not in default_origins:
            default_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(sites.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(advances.router, prefix="/api")
app.include_router(payroll.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Attendly API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy"
    }
