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
    admin_setting = db.query(AdminSettings).filter(AdminSettings.is_demo == False).first()
    if not admin_setting:
        # Initialize default admin settings if not seeded yet
        default_hash = hash_mpin(settings.ADMIN_MPIN)
        admin_setting = AdminSettings(
            hashed_mpin=default_hash,
            app_title="Attendly",
            account_type="admin",
            is_demo=False
        )
        db.add(admin_setting)
        db.commit()
        db.refresh(admin_setting)

    if not admin_setting.hashed_mpin or not verify_mpin(req.mpin, admin_setting.hashed_mpin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect MPIN. Please try again.",
        )

    access_token = create_access_token(data={
        "sub": str(admin_setting.id),
        "account_id": admin_setting.id,
        "is_demo": False
    })
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        app_title=admin_setting.app_title or "Attendly",
        is_demo=False
    )

@router.post("/demo-login", response_model=TokenResponse)
def login_demo(db: Session = Depends(get_db)):
    demo_account = db.query(AdminSettings).filter(AdminSettings.is_demo == True).first()
    if not demo_account:
        # Auto-provision demo account if not exists
        demo_account = AdminSettings(
            hashed_mpin=None,
            app_title="Attendly (Demo)",
            account_type="demo",
            is_demo=True
        )
        db.add(demo_account)
        db.commit()
        db.refresh(demo_account)

        # Trigger fictional data seeding for this demo account
        try:
            from ..core.demo_seeder import seed_fictional_demo_data
            seed_fictional_demo_data(db, demo_account.id)
        except Exception as e:
            print(f"[DEMO SETUP] Warning seeding fictional data: {e}")

    access_token = create_access_token(data={
        "sub": str(demo_account.id),
        "account_id": demo_account.id,
        "is_demo": True
    })
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        app_title=demo_account.app_title or "Attendly (Demo)",
        is_demo=True
    )

@router.get("/verify")
def verify_session(current_admin = Depends(get_current_admin)):
    return {
        "authenticated": True,
        "role": current_admin.get("role", "admin"),
        "account_id": current_admin.get("account_id"),
        "is_demo": current_admin.get("is_demo", False)
    }

@router.post("/change-mpin")
def change_mpin(req: ChangeMPINRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    account_id = current_admin["account_id"]
    admin_setting = db.query(AdminSettings).filter(AdminSettings.id == account_id).first()
    if not admin_setting or not admin_setting.hashed_mpin or not verify_mpin(req.current_mpin, admin_setting.hashed_mpin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current MPIN is incorrect.",
        )

    admin_setting.hashed_mpin = hash_mpin(req.new_mpin)
    db.commit()
    return {"message": "MPIN updated successfully."}
