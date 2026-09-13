from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_mpin, hash_mpin, create_access_token, get_current_admin
from ..core.config import settings
from ..models.admin import AdminSettings
from ..schemas.schemas import LoginMPINRequest, TokenResponse, ChangeMPINRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login-mpin", response_model=TokenResponse)
def login_with_mpin(req: LoginMPINRequest, db: Session = Depends(get_db)):
    admin_setting = db.query(AdminSettings).first()
    if not admin_setting:
        # Initialize default admin settings if not seeded yet
        default_hash = hash_mpin(settings.ADMIN_MPIN)
        admin_setting = AdminSettings(hashed_mpin=default_hash, app_title="Attendly")
        db.add(admin_setting)
        db.commit()
        db.refresh(admin_setting)

    if not verify_mpin(req.mpin, admin_setting.hashed_mpin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect MPIN. Please try again.",
        )

    access_token = create_access_token(data={"sub": "admin"})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        app_title=admin_setting.app_title or "Attendly"
    )

@router.get("/verify")
def verify_session(current_admin = Depends(get_current_admin)):
    return {"authenticated": True, "role": "admin"}

@router.post("/change-mpin")
def change_mpin(req: ChangeMPINRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    admin_setting = db.query(AdminSettings).first()
    if not admin_setting or not verify_mpin(req.current_mpin, admin_setting.hashed_mpin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current MPIN is incorrect.",
        )

    admin_setting.hashed_mpin = hash_mpin(req.new_mpin)
    db.commit()
    return {"message": "MPIN updated successfully."}
