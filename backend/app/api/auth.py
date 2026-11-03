import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.security import hash_mpin, create_access_token, get_current_admin, revoke_all_sessions
from ..models.admin import AdminSettings
from ..schemas.schemas import LoginMPINRequest, TokenResponse, ChangeMPINRequest
from ..services.login_throttle import InvalidMpin, LoginLocked, verify_mpin_with_throttle
from ..services.trusted_devices import find_active_device, issue_device, revoke_all_devices, touch_device

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Arbitrary constant key for the transaction-scoped advisory lock that serialises account bootstrap.
_BOOTSTRAP_LOCK_KEY = 0x4154544E  # "ATTN"


def _client_ip(request: Request) -> Optional[str]:
    """
    Client address used to key per-client lockouts. Vercel overwrites X-Forwarded-For with the real
    client IP. Elsewhere the header may be spoofable, which is why the account-wide limit, not this
    key, is the hard brute-force bound.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _locked_response(locked: LoginLocked) -> HTTPException:
    minutes = max(1, -(-locked.retry_after_seconds // 60))
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many incorrect attempts. Please try again in {minutes} minute{'s' if minutes != 1 else ''}.",
        headers={"Retry-After": str(locked.retry_after_seconds)},
    )


def _get_or_bootstrap_admin(db: Session) -> Optional[AdminSettings]:
    """
    Returns the primary (non-demo) admin account. On a brand-new database it is created from the
    explicitly configured ADMIN_MPIN; there is no default MPIN.
    """
    admin = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(False)).order_by(AdminSettings.id.asc()).first()
    if admin or not settings.ADMIN_MPIN:
        return admin

    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _BOOTSTRAP_LOCK_KEY})
    admin = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(False)).order_by(AdminSettings.id.asc()).first()
    if not admin:
        admin = AdminSettings(
            hashed_mpin=hash_mpin(settings.ADMIN_MPIN),
            app_title="Attendly",
            account_type="admin",
            is_demo=False,
        )
        db.add(admin)
        logger.info("Bootstrapped primary admin account from ADMIN_MPIN.")
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/login-mpin", response_model=TokenResponse)
def login_with_mpin(req: LoginMPINRequest, request: Request, db: Session = Depends(get_db)):
    incorrect = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect MPIN. Please try again.")

    admin_setting = _get_or_bootstrap_admin(db)
    if not admin_setting:
        logger.error("Login attempted but no admin account exists and ADMIN_MPIN is not configured.")
        raise incorrect

    device = find_active_device(db, admin_setting.id, req.device_token)
    try:
        verify_mpin_with_throttle(
            db, admin_setting, req.mpin, _client_ip(request), device_id=device.id if device else None
        )
    except LoginLocked as locked:
        logger.warning("MPIN login rejected: lockout active for account %s (trusted device: %s).",
                       admin_setting.id, bool(device))
        raise _locked_response(locked)
    except InvalidMpin:
        logger.info("Incorrect MPIN for account %s (trusted device: %s).", admin_setting.id, bool(device))
        raise incorrect

    if device:
        touch_device(device)
        device_token = req.device_token
    else:
        device_token = issue_device(db, admin_setting.id)
    db.commit()

    access_token = create_access_token(
        data={"sub": str(admin_setting.id), "account_id": admin_setting.id, "is_demo": False},
        account=admin_setting,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        app_title=admin_setting.app_title or "Attendly",
        is_demo=False,
        device_token=device_token,
    )


@router.post("/demo-login", response_model=TokenResponse)
def login_demo(db: Session = Depends(get_db)):
    demo_account = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(True)).order_by(AdminSettings.id.asc()).first()
    if not demo_account:
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _BOOTSTRAP_LOCK_KEY})
        demo_account = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(True)).order_by(AdminSettings.id.asc()).first()
        if not demo_account:
            demo_account = AdminSettings(
                hashed_mpin=None,
                app_title="Attendly (Demo)",
                account_type="demo",
                is_demo=True,
            )
            db.add(demo_account)
            db.commit()  # persists the account and releases the advisory lock
            db.refresh(demo_account)
            try:
                from ..core.demo_seeder import seed_fictional_demo_data
                seed_fictional_demo_data(db, demo_account.id)
            except Exception:
                db.rollback()
                logger.exception("Failed to seed fictional demo data.")
        else:
            db.commit()  # release the advisory lock

    access_token = create_access_token(
        data={"sub": str(demo_account.id), "account_id": demo_account.id, "is_demo": True},
        account=demo_account,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        app_title=demo_account.app_title or "Attendly (Demo)",
        is_demo=True,
    )


@router.get("/verify")
def verify_session(current_admin=Depends(get_current_admin)):
    return {
        "authenticated": True,
        "role": current_admin.get("role", "admin"),
        "account_id": current_admin.get("account_id"),
        "is_demo": current_admin.get("is_demo", False),
    }


@router.post("/change-mpin")
def change_mpin(
    req: ChangeMPINRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    incorrect = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current MPIN is incorrect.")

    admin_setting = db.get(AdminSettings, current_admin["account_id"])
    if not admin_setting or not admin_setting.hashed_mpin:
        raise incorrect

    try:
        verify_mpin_with_throttle(db, admin_setting, req.current_mpin, _client_ip(request))
    except LoginLocked as locked:
        raise _locked_response(locked)
    except InvalidMpin:
        raise incorrect

    admin_setting.hashed_mpin = hash_mpin(req.new_mpin)
    revoke_all_sessions(admin_setting)
    revoke_all_devices(db, admin_setting.id)
    device_token = issue_device(db, admin_setting.id)
    db.commit()
    db.refresh(admin_setting)
    logger.info("MPIN changed for account %s; earlier sessions and trusted devices are revoked.", admin_setting.id)

    # Earlier sessions and devices are now invalid; hand back fresh ones for the current device.
    new_token = create_access_token(
        data={"sub": str(admin_setting.id), "account_id": admin_setting.id, "is_demo": bool(admin_setting.is_demo)},
        account=admin_setting,
    )
    return {
        "message": "MPIN updated successfully.",
        "access_token": new_token,
        "token_type": "bearer",
        "device_token": device_token,
    }
