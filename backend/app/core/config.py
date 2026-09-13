import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

def fix_database_url(url: str) -> str:
    """Ensure SQLAlchemy receives a valid postgresql:// URI format (e.g. from Neon)."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

class Settings(BaseSettings):
    PROJECT_NAME: str = "Contractor Workforce Attendance"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://lakshya@localhost:5432/contractor_db")
    SECRET_KEY: str = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY", "super_secret_jwt_key_contractor_attendance_app_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days for mobile app convenience
    ADMIN_MPIN: str = os.getenv("ADMIN_MPIN", "1234")
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL", None)

    class Config:
        case_sensitive = True

settings = Settings()
