from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings, fix_database_url

db_url = fix_database_url(settings.DATABASE_URL)

engine = create_engine(
    db_url,
    pool_pre_ping=True,  # Crucial for Neon serverless auto-suspend and auto-reconnect
    pool_recycle=300,    # Recycle idle connections every 5 mins to prevent dropped sockets
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
