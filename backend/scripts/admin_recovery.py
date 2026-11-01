"""
Attendly admin recovery: the out-of-band path for the legitimate administrator.

Requires direct database credentials, which only the owner has, so it works even when every login
path is locked. It is independent of the application config: it reads only DATABASE_URL from the
environment (no .env loading) and refuses to run unless --confirm-host matches the target host.

Commands (default account: the primary, non-demo admin):
  status           Show lockout buckets, session epoch and trusted-device count. Read-only.
  unlock           Clear every MPIN lockout and escalation level for the account.
  revoke-sessions  Log out every session and forget every trusted device.
  reset-mpin       Set a new MPIN (prompted, never echoed or passed as an argument), then
                   revoke sessions and devices and clear lockouts.
  enrol-device     Print a one-time recovery code (single use, expires after --minutes, default 15).
                   On a new browser, choose "Use a recovery code", enter it, then the MPIN: that
                   browser becomes a trusted device even while the account-wide lockout is active.
                   The code alone grants nothing; the correct MPIN is still required.

  DATABASE_URL='postgresql://...' python scripts/admin_recovery.py --confirm-host <host> status
"""
import argparse
import getpass
import hashlib
import os
import secrets
import sys
import urllib.parse
from typing import Optional

import bcrypt
from sqlalchemy import create_engine, text

# Must match app/services/enrolment.py.
CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CODE_LENGTH = 12
DEFAULT_CODE_MINUTES = 15
MAX_CODE_MINUTES = 60


def primary_account_id(conn) -> int:
    row = conn.execute(text("SELECT id FROM admin_settings WHERE is_demo = false ORDER BY id LIMIT 1")).first()
    if row is None:
        raise SystemExit("No primary (non-demo) admin account exists.")
    return row[0]


def status(conn, account_id: int) -> dict:
    account = conn.execute(
        text("SELECT id, account_type, is_demo, session_epoch FROM admin_settings WHERE id = :id"), {"id": account_id}
    ).mappings().first()
    if account is None:
        raise SystemExit(f"Account {account_id} does not exist.")
    buckets = conn.execute(text(
        "SELECT scope, failed_count, lockout_level, locked_until, locked_until > now() AS active "
        "FROM auth_login_attempts WHERE account_id = :id ORDER BY scope"
    ), {"id": account_id}).mappings().all()
    devices = conn.execute(text(
        "SELECT count(*) FROM auth_trusted_devices WHERE account_id = :id AND revoked_at IS NULL"
    ), {"id": account_id}).scalar()
    codes = conn.execute(text(
        "SELECT count(*) FROM auth_enrolment_codes WHERE account_id = :id "
        "AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()"
    ), {"id": account_id}).scalar()
    return {"account": dict(account), "buckets": [dict(b) for b in buckets], "active_trusted_devices": devices,
            "pending_enrolment_codes": codes}


def unlock(conn, account_id: int) -> int:
    return conn.execute(text("DELETE FROM auth_login_attempts WHERE account_id = :id"), {"id": account_id}).rowcount


def create_enrolment_code(conn, account_id: int, minutes: int = DEFAULT_CODE_MINUTES) -> tuple:
    """
    Creates a one-time enrolment code and returns (display code, expires_at). Any earlier unused code
    of the account is revoked, so at most one is valid at a time. Only the SHA-256 hash is stored;
    hashing and normalisation must match app/services/enrolment.py (covered by the test suite).
    """
    if not (1 <= int(minutes) <= MAX_CODE_MINUTES):
        raise SystemExit(f"--minutes must be between 1 and {MAX_CODE_MINUTES}.")
    if conn.execute(text("SELECT 1 FROM admin_settings WHERE id = :id"), {"id": account_id}).first() is None:
        raise SystemExit(f"Account {account_id} does not exist.")
    code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
    conn.execute(text(
        "UPDATE auth_enrolment_codes SET revoked_at = now() "
        "WHERE account_id = :id AND used_at IS NULL AND revoked_at IS NULL"
    ), {"id": account_id})
    expires_at = conn.execute(text(
        "INSERT INTO auth_enrolment_codes (account_id, code_hash, created_at, expires_at, failed_attempts) "
        "VALUES (:id, :h, now(), now() + make_interval(mins => :m), 0) RETURNING expires_at"
    ), {"id": account_id, "h": hashlib.sha256(code.encode("utf-8")).hexdigest(), "m": int(minutes)}).scalar()
    return "-".join(code[i:i + 4] for i in range(0, CODE_LENGTH, 4)), expires_at


def revoke_sessions(conn, account_id: int) -> int:
    conn.execute(text("UPDATE admin_settings SET session_epoch = session_epoch + 1 WHERE id = :id"), {"id": account_id})
    conn.execute(text(
        "UPDATE auth_enrolment_codes SET revoked_at = now() WHERE account_id = :id AND used_at IS NULL AND revoked_at IS NULL"
    ), {"id": account_id})
    return conn.execute(text(
        "UPDATE auth_trusted_devices SET revoked_at = now() WHERE account_id = :id AND revoked_at IS NULL"
    ), {"id": account_id}).rowcount


def validate_mpin(mpin: str) -> str:
    mpin = (mpin or "").strip()
    if not (mpin.isdigit() and 4 <= len(mpin) <= 6):
        raise SystemExit("MPIN must be 4 to 6 numeric digits.")
    return mpin


def reset_mpin(conn, account_id: int, new_mpin: str) -> None:
    hashed = bcrypt.hashpw(validate_mpin(new_mpin).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    conn.execute(text("UPDATE admin_settings SET hashed_mpin = :h WHERE id = :id"), {"h": hashed, "id": account_id})
    revoke_sessions(conn, account_id)
    unlock(conn, account_id)


def _prompt_new_mpin() -> str:
    first = getpass.getpass("New MPIN (4-6 digits): ")
    if getpass.getpass("Repeat new MPIN: ") != first:
        raise SystemExit("MPINs do not match; nothing changed.")
    return validate_mpin(first)


def _print_status(info: dict) -> None:
    acc = info["account"]
    print(f"Account {acc['id']} ({acc['account_type']}, demo={acc['is_demo']}), session epoch {acc['session_epoch']}, "
          f"{info['active_trusted_devices']} active trusted device(s), "
          f"{info['pending_enrolment_codes']} pending recovery code(s)")
    if not info["buckets"]:
        print("  No lockout counters.")
    for b in info["buckets"]:
        kind = b["scope"].split(":", 1)[0]
        state = f"LOCKED until {b['locked_until']:%Y-%m-%d %H:%M %Z}" if b["active"] else "not locked"
        print(f"  {kind:8s} failures={b['failed_count']} escalation_level={b['lockout_level']} {state}")


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--confirm-host", required=True, help="Exact hostname of the target database.")
    parser.add_argument("--account-id", type=int, help="Defaults to the primary (non-demo) admin account.")
    parser.add_argument("--minutes", type=int, default=DEFAULT_CODE_MINUTES,
                        help=f"enrol-device only: code lifetime, 1-{MAX_CODE_MINUTES} minutes (default {DEFAULT_CODE_MINUTES}).")
    parser.add_argument("command", choices=["status", "unlock", "revoke-sessions", "reset-mpin", "enrol-device"])
    args = parser.parse_args(argv)

    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("DATABASE_URL is not set.", file=sys.stderr)
        return 2
    url = url.replace("postgres://", "postgresql://", 1) if url.startswith("postgres://") else url
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    if host != args.confirm_host.strip().lower():
        print(f"Refusing to run: target host is '{host}', but --confirm-host was '{args.confirm_host}'.", file=sys.stderr)
        return 2

    new_mpin = _prompt_new_mpin() if args.command == "reset-mpin" else None
    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            account_id = args.account_id or primary_account_id(conn)
            if args.command == "unlock":
                print(f"Cleared {unlock(conn, account_id)} lockout counter(s).")
            elif args.command == "revoke-sessions":
                print(f"Revoked all sessions and {revoke_sessions(conn, account_id)} trusted device(s).")
            elif args.command == "reset-mpin":
                reset_mpin(conn, account_id, new_mpin)
                print("MPIN reset. All sessions and trusted devices revoked; lockouts cleared.")
            elif args.command == "enrol-device":
                code, expires_at = create_enrolment_code(conn, account_id, args.minutes)
                print(f"One-time recovery code: {code}")
                print(f"Valid until {expires_at:%Y-%m-%d %H:%M %Z}, single use; any earlier unused code is revoked.")
                print("On the new browser: Login -> 'Use a recovery code' -> enter the code, then your MPIN.")
                print("The code alone grants nothing; the MPIN is still required. 3 wrong MPINs burn the code.")
            _print_status(status(conn, account_id))
        return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
