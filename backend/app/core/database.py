from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings, fix_database_url

db_url = fix_database_url(settings.DATABASE_URL)

# Safety check: sanitize and log the target database
import urllib.parse
try:
    parsed_db = urllib.parse.urlparse(db_url)
    sanitized_host = f"{parsed_db.hostname}:{parsed_db.port or 5432}{parsed_db.path}"
    print(f"[DATABASE SAFETY] Connected to database target: {sanitized_host}")
except Exception as e:
    print(f"[DATABASE SAFETY] Could not parse DB URL: {e}")

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
