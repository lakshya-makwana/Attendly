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
- Only the production deployment may use the production database. On Vercel the deployment
  environment comes from the system variable VERCEL_ENV (it cannot be set per project), so a
  Preview deployment that inherits the production DATABASE_URL refuses to start instead of
  connecting. ALLOW_REMOTE_DATABASE does not override this. Every connection-string form libpq
  accepts is inspected (see classify_database_target); a target that cannot be classified is refused.
"""
import logging
import os
import re
import secrets
import urllib.parse
from typing import Optional, Tuple

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

load_dotenv()

logger = logging.getLogger(__name__)

# Secret that shipped in earlier versions of this file. It is public, so it is never accepted.
_KNOWN_INSECURE_SECRETS = {"super_secret_jwt_key_contractor_attendance_app_2026"}
_REMOTE_DB_HOST_MARKERS = ("neon.tech", "amazonaws.com", "aws.")
_MIN_RECOMMENDED_SECRET_LENGTH = 32
# Neon endpoint of the production database (also named in tests/test_db_guard.py). A host containing
# any marker may only be used by the production deployment. PRODUCTION_DATABASE_HOSTS (comma-separated
# markers) adds more; it can only extend this list, never shrink it.
_PRODUCTION_DB_HOST_MARKERS = ("ep-still-queen",)


class ConfigurationError(RuntimeError):
    """Raised when mandatory configuration is missing or unsafe."""


def fix_database_url(url: str) -> str:
    """Ensure SQLAlchemy receives a valid postgresql:// URI format (e.g. from Neon)."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes"}


DB_TARGET_PRODUCTION = "production"
DB_TARGET_OTHER = "other"
DB_TARGET_UNCLASSIFIABLE = "unclassifiable"

# libpq falls back to these when the connection string leaves a parameter out, so they can change the
# real target (host, endpoint via options/password, or a whole service definition).
_LIBPQ_TARGET_ENV_VARS = (
    "PGHOST", "PGHOSTADDR", "PGPORT", "PGOPTIONS", "PGPASSWORD", "PGUSER", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE",
)
# Neon accepts the endpoint id outside the hostname for clients without SNI: `options=endpoint=ep-…`
# or a password of the form `endpoint=ep-…;secret`.
_NEON_ENDPOINT_PARAM = re.compile(r"endpoint\s*[=:]\s*ep-[a-z0-9-]+")


def _production_markers() -> tuple:
    extra = [m.strip().lower() for m in os.getenv("PRODUCTION_DATABASE_HOSTS", "").split(",") if m.strip()]
    return (*_PRODUCTION_DB_HOST_MARKERS, *extra)


def _decoded_forms(value: str) -> list:
    """The value lower-cased and repeatedly percent-decoded, so encoded markers cannot hide."""
    forms, current = [], (value or "").lower()
    for _ in range(4):
        forms.append(current)
        decoded = urllib.parse.unquote_plus(current).lower()
        if decoded == current:
            break
        current = decoded
    return forms


def _mentions_marker(value: str, markers: tuple) -> bool:
    # A marker counts only as a whole name component (so "ep-still-queen-a1b2" and "ep-still-queen."
    # match, but "ep-still-queenie" or "xep-still-queen" do not).
    for form in _decoded_forms(value):
        for marker in markers:
            if re.search(r"(?<![a-z0-9-])" + re.escape(marker) + r"(?![a-z0-9])", form):
                return True
    return False


def classify_database_target(url: str) -> Tuple[str, str]:
    """
    Classifies where a DATABASE_URL really connects: DB_TARGET_PRODUCTION, DB_TARGET_OTHER, or
    DB_TARGET_UNCLASSIFIABLE (with a reason) when the target is decided somewhere this process cannot
    inspect. Callers outside production must treat anything but DB_TARGET_OTHER as forbidden.
    """
    markers = _production_markers()
    env = {name: os.environ[name] for name in _LIBPQ_TARGET_ENV_VARS if os.environ.get(name)}

    # 1. The production endpoint named anywhere libpq could take it from: hostname, multi-host lists,
    #    ?host=, ?options=, credentials, keyword-style strings, or PG* environment fallbacks.
    if _mentions_marker(url, markers) or any(_mentions_marker(v, markers) for v in env.values()):
        return DB_TARGET_PRODUCTION, "it names the production database"

    try:
        parsed = make_url(fix_database_url((url or "").strip()))
    except Exception:
        return DB_TARGET_UNCLASSIFIABLE, "it is not a postgresql:// URL (keyword-style or malformed)"
    if not parsed.drivername.startswith("postgresql"):
        return DB_TARGET_UNCLASSIFIABLE, f"driver '{parsed.drivername}' is not PostgreSQL"

    query = {k.lower(): (v if isinstance(v, tuple) else (v,)) for k, v in parsed.query.items()}
    if "service" in query or "PGSERVICE" in env or "PGSERVICEFILE" in env:
        return DB_TARGET_UNCLASSIFIABLE, "the target comes from a libpq service definition"

    hosts = list((parsed.host or "").split(","))
    for value in query.get("host", ()):
        hosts += value.split(",")
    hosts = [h.strip().lower() for h in hosts if h.strip()]
    if not hosts and "PGHOST" in env:
        hosts = [h.strip().lower() for h in env["PGHOST"].split(",") if h.strip()]
    if not hosts and (query.get("hostaddr") or "PGHOSTADDR" in env):
        return DB_TARGET_UNCLASSIFIABLE, "it connects by IP address (hostaddr) without a host name"

    endpoint_sources = [parsed.password or "", *query.get("options", ()), env.get("PGOPTIONS", ""), env.get("PGPASSWORD", "")]
    endpoint_named = any(_NEON_ENDPOINT_PARAM.search(form) for s in endpoint_sources for form in _decoded_forms(s))
    for host in hosts:
        if host == "neon.tech" or host.endswith(".neon.tech"):
            if not host.split(".")[0].startswith("ep-") and not endpoint_named:
                return DB_TARGET_UNCLASSIFIABLE, (
                    f"Neon host '{host}' does not name an endpoint (it could come from a password file)"
                )
    return DB_TARGET_OTHER, ""


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
    LOGIN_DEVICE_MAX_FAILED_ATTEMPTS: int = 5     # per trusted device before that device's first lockout
    LOGIN_MAX_TRUSTED_DEVICES: int = 10           # active trusted devices per account (oldest revoked beyond this)
    LOGIN_TRUSTED_DEVICE_DAYS: int = 90           # a trusted device unused for this long must log in anonymously again
    LOGIN_ENROLMENT_MAX_MPIN_ATTEMPTS: int = 3    # wrong MPINs with one recovery enrolment code before it is burned

    @property
    def is_production(self) -> bool:
        return (
            self.ENVIRONMENT.strip().lower() == "production"
            or bool(os.getenv("VERCEL"))
            or os.getenv("VERCEL_ENV") in {"production", "preview"}
        )

    @property
    def deployment_environment(self) -> str:
        """'production', 'preview' or 'development'. On Vercel only the system VERCEL_ENV counts; if it is
        missing the result is 'unknown', which is treated as non-production (fail closed)."""
        if os.getenv("VERCEL"):
            return (os.getenv("VERCEL_ENV") or "unknown").strip().lower()
        return self.ENVIRONMENT.strip().lower()

    @property
    def is_production_deployment(self) -> bool:
        return self.deployment_environment == "production"


def _validate(settings: Settings) -> None:
    if not settings.DATABASE_URL:
        raise ConfigurationError("DATABASE_URL is not configured.")

    if not settings.is_production_deployment:
        target, reason = classify_database_target(settings.DATABASE_URL)
        if target == DB_TARGET_PRODUCTION:
            raise ConfigurationError(
                f"Refusing to connect the '{settings.deployment_environment}' environment to the production "
                "database. Preview and development deployments must use their own database "
                "(see DEPLOYMENT.md, 'Environment isolation')."
            )
        if target != DB_TARGET_OTHER:
            raise ConfigurationError(
                f"Refusing to start the '{settings.deployment_environment}' environment: the database target "
                f"cannot be safely classified ({reason}). Use a postgresql:// URL with an explicit host name."
            )

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
