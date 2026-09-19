from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings

security_bearer = HTTPBearer(auto_error=False)

def hash_mpin(mpin: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(mpin.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_mpin(plain_mpin: str, hashed_mpin: str) -> bool:
    try:
        return bcrypt.checkpw(plain_mpin.encode("utf-8"), hashed_mpin.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "role": "admin"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing. Please enter your MPIN.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role: str = payload.get("role")
        if role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required.",
            )

        # Resolve account_id from payload (default to 1 for backward compatibility with legacy tokens)
        account_id = payload.get("account_id")
        if account_id is None:
            sub = payload.get("sub")
            if sub and str(sub).isdigit():
                account_id = int(sub)
            else:
                account_id = 1
        else:
            account_id = int(account_id)

        is_demo = bool(payload.get("is_demo", False))

        return {
            "account_id": account_id,
            "is_demo": is_demo,
            "role": role,
            "sub": payload.get("sub")
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please enter your MPIN again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
