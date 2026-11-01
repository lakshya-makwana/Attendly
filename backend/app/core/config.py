"""
Application configuration.

Security-sensitive values have no hard-coded fallbacks:
- In production (ENVIRONMENT=production, or running on Vercel) the app refuses to start
  when DATABASE_URL or the JWT secret is missing.
- In local development a missing JWT secret is replaced by a random per-process secret
  (sessions do not survive restarts), and the local app refuses to connect to a remote
  production database host unless ALLOW_REMOTE_DATABASE=true is set explicitly.
- ADMIN_MPIN is only used to bootstrap the admin account on a brand-new database. There is
  no default MPIN; if it is unset, no admin account is auto-created.
"""
import logging
import os
import secrets
import urllib.parse
from typing import Optional

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

logger = logging.getLogger(__name__)

# Secret that shipped in earlier versions of this file. It is public, so it is never accepted.
_KNOWN_INSECURE_SECRETS = {"super_secret_jwt_key_contractor_attendance_app_2026"}
_REMOTE_DB_HOST_MARKERS = ("neon.tech", "amazonaws.com", "aws.")
_MIN_RECOMMENDED_SECRET_LENGTH = 32


class ConfigurationError(RuntimeError):
    """Raised when mandatory configuration is missing or unsafe."""


def fix_database_url(url: str) -> str:
    """Ensure SQLAlchemy receives a valid postgresql:// URI format (e.g. from Neon)."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Attendly"
    ENVIRONMENT: str = "development"
    DATABASE_URL: Optional[str] = None
    SECRET_KEY: Optional[str] = Field(default=None, validation_alias=AliasChoices("JWT_SECRET", "SECRET_KEY"))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days for mobile app convenience
    ADMIN_MPIN: Optional[str] = None
    FRONTEND_URL: Optional[str] = None

    # MPIN brute-force protection (escalating lockouts; see app/services/login_throttle.py)
    LOGIN_MAX_FAILED_ATTEMPTS: int = 5            # per client (IP) before that client's first lockout
    LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS: int = 10   # across all clients before the account's first lockout
    LOGIN_ESCALATED_MAX_FAILED_ATTEMPTS: int = 3  # failures allowed between later, escalated lockouts
    LOGIN_LOCKOUT_MINUTES: int = 15               # first lockout; each further lockout doubles
    LOGIN_MAX_LOCKOUT_MINUTES: int = 24 * 60      # escalation cap
    LOGIN_LOCKOUT_RESET_HOURS: int = 24           # quiet period (no failures, no lock) that resets escalation

    @property
    def is_production(self) -> bool:
        return (
            self.ENVIRONMENT.strip().lower() == "production"
            or bool(os.getenv("VERCEL"))
            or os.getenv("VERCEL_ENV") in {"production", "preview"}
        )


def _validate(settings: Settings) -> None:
    if not settings.DATABASE_URL:
        raise ConfigurationError("DATABASE_URL is not configured.")

    secret = (settings.SECRET_KEY or "").strip()
    if secret in _KNOWN_INSECURE_SECRETS:
        raise ConfigurationError("JWT secret is set to a publicly known value. Generate a new one (openssl rand -hex 32).")

    if settings.is_production:
        if not secret:
            raise ConfigurationError("JWT_SECRET (or SECRET_KEY) must be configured in production.")
        if len(secret) < _MIN_RECOMMENDED_SECRET_LENGTH:
            logger.warning("JWT secret is shorter than %d characters; consider rotating it.", _MIN_RECOMMENDED_SECRET_LENGTH)
    else:
        if not secret:
            logger.warning("JWT secret not configured; using a random per-process secret (sessions reset on restart).")
            settings.SECRET_KEY = secrets.token_hex(32)

        host = (urllib.parse.urlparse(fix_database_url(settings.DATABASE_URL)).hostname or "").lower()
        if any(marker in host for marker in _REMOTE_DB_HOST_MARKERS) and not _env_flag("ALLOW_REMOTE_DATABASE"):
            raise ConfigurationError(
                f"Refusing to connect a non-production environment to remote database host '{host}'. "
                "Point DATABASE_URL at a local database, or set ALLOW_REMOTE_DATABASE=true deliberately."
            )

    if settings.ADMIN_MPIN is not None:
        mpin = settings.ADMIN_MPIN.strip()
        if not (mpin.isdigit() and 4 <= len(mpin) <= 6):
            raise ConfigurationError("ADMIN_MPIN must be 4 to 6 numeric digits.")
        settings.ADMIN_MPIN = mpin


settings = Settings()
_validate(settings)
