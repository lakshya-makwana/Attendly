import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from ..models.admin import AdminSettings

security_bearer = HTTPBearer(auto_error=False)

# Claim holding a fingerprint of the account's MPIN hash at issue time.
# Changing the MPIN changes the fingerprint, which revokes every token issued before the change.
MPIN_VERSION_CLAIM = "mpv"
# Claim holding the account's session epoch at issue time (see AdminSettings.session_epoch).
SESSION_EPOCH_CLAIM = "sep"


def hash_mpin(mpin: str) -> str:
    return bcrypt.hashpw(mpin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_mpin(plain_mpin: str, hashed_mpin: str) -> bool:
    try:
        return bcrypt.checkpw(plain_mpin.encode("utf-8"), hashed_mpin.encode("utf-8"))
    except Exception:
        return False


def mpin_fingerprint(hashed_mpin: Optional[str]) -> str:
    """Keyed, truncated fingerprint of the stored MPIN hash. Reveals nothing about the MPIN itself."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"), (hashed_mpin or "").encode("utf-8"), hashlib.sha256
    ).hexdigest()[:16]


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, *, account=None) -> str:
    """
    Signs an admin session token.

    Pass `account` (an AdminSettings row) for every real session. Two independent revocation
    mechanisms then apply (see get_current_admin):
    - MPIN binding: revoked whenever the MPIN hash changes, even if changed directly in the database.
    - Session epoch: revoked whenever revoke_all_sessions() increments the account's epoch. Exact
      (no clocks or timestamp precision involved) and also covers legacy tokens, which count as epoch 0.
    Tokens signed without `account` count as epoch 0 and stop working after the first revocation.
    """
    now = datetime.now(timezone.utc)
    to_encode = data.copy()
    to_encode.update({
        "iat": now,
        "exp": now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)),
        "role": "admin",
    })
    if account is not None:
        to_encode[MPIN_VERSION_CLAIM] = mpin_fingerprint(account.hashed_mpin)
        to_encode[SESSION_EPOCH_CLAIM] = int(account.session_epoch or 0)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def revoke_all_sessions(account) -> None:
    """
    Revokes every session token issued for `account` so far. Caller commits and must refresh the row
    before issuing a new token (the increment is applied in SQL, so concurrent revocations never lose one).
    """
    account.session_epoch = AdminSettings.session_epoch + 1


def _token_epoch(payload: dict) -> Optional[int]:
    """Epoch carried by the token; tokens issued before epochs existed carry none and count as 0."""
    value = payload.get(SESSION_EPOCH_CLAIM, 0)
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _invalid_session() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session. Please enter your MPIN again.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _account_id_from_claims(payload: dict) -> int:
    account_id = payload.get("account_id")
    if account_id is None:
        sub = payload.get("sub")
        if sub is not None and str(sub).isdigit():
            account_id = sub
    try:
        return int(account_id)
    except (TypeError, ValueError):
        raise _invalid_session()


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing. Please enter your MPIN.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require_exp": True},
        )
    except JWTError:
        raise _invalid_session()

    role = payload.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required.",
        )

    account = db.get(AdminSettings, _account_id_from_claims(payload))
    if account is None:
        raise _invalid_session()

    bound_version = payload.get(MPIN_VERSION_CLAIM)
    if bound_version is not None and not hmac.compare_digest(
        str(bound_version), mpin_fingerprint(account.hashed_mpin)
    ):
        raise _invalid_session()

    if _token_epoch(payload) != int(account.session_epoch or 0):
        raise _invalid_session()

    return {
        "account_id": account.id,
        "is_demo": bool(account.is_demo),
        "role": role,
        "sub": payload.get("sub"),
    }
