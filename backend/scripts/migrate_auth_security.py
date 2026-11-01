"""
Applies scripts/migrate_auth_security.sql in a single transaction and verifies the result.

Deliberately independent of the application config: it reads only DATABASE_URL from the
environment (no .env loading) and refuses to run unless --confirm-host matches the target
database host exactly, so it cannot be pointed at the wrong database by accident.

    DATABASE_URL='postgresql://...' python scripts/migrate_auth_security.py --confirm-host <host>
    DATABASE_URL='postgresql://...' python scripts/migrate_auth_security.py --confirm-host <host> --verify-only
"""
import argparse
import os
import sys
import urllib.parse
from pathlib import Path

from sqlalchemy import create_engine, text

SQL_FILE = Path(__file__).resolve().with_name("migrate_auth_security.sql")

# (table, column) pairs that must exist after the migration.
EXPECTED_COLUMNS = [
    ("auth_login_attempts", "id"),
    ("auth_login_attempts", "account_id"),
    ("auth_login_attempts", "scope"),
    ("auth_login_attempts", "failed_count"),
    ("auth_login_attempts", "lockout_level"),
    ("auth_login_attempts", "locked_until"),
    ("auth_login_attempts", "last_failed_at"),
    ("auth_login_attempts", "updated_at"),
    ("admin_settings", "session_epoch"),
]


def _normalise_url(url: str) -> str:
    return url.replace("postgres://", "postgresql://", 1) if url.startswith("postgres://") else url


def missing_columns(conn) -> list:
    rows = conn.execute(text(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()"
    )).all()
    present = {(r[0], r[1]) for r in rows}
    return [pair for pair in EXPECTED_COLUMNS if pair not in present]


def apply(conn) -> None:
    conn.exec_driver_sql(SQL_FILE.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--confirm-host", required=True, help="Exact hostname of the target database.")
    parser.add_argument("--verify-only", action="store_true", help="Only report missing objects; change nothing.")
    args = parser.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set.", file=sys.stderr)
        return 2
    url = _normalise_url(url)
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if host != args.confirm_host.strip().lower():
        print(f"Refusing to run: target host is '{host}', but --confirm-host was '{args.confirm_host}'.", file=sys.stderr)
        return 2
    print(f"Target database: {host}:{parsed.port or 5432}{parsed.path}")

    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            if not args.verify_only:
                apply(conn)
                print("Migration statements applied.")
            missing = missing_columns(conn)
            if missing:
                if not args.verify_only:
                    raise RuntimeError(f"Verification failed after migration; rolling back. Missing: {missing}")
                print(f"Missing objects: {missing}")
                return 1
        print("Verification passed: all authentication security objects are present.")
        return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
