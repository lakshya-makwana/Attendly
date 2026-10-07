import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

def migrate():
    print("Running database schema update for worker is_active column...")
    with engine.connect() as conn:
        with conn.begin():
            # 1. Add is_active column if not exists
            conn.execute(text("""
                ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            """))

            # 2. Backfill existing records to TRUE
            conn.execute(text("""
                UPDATE workers SET is_active = TRUE WHERE is_active IS NULL;
            """))

            # 3. Enforce NOT NULL constraint
            conn.execute(text("""
                ALTER TABLE workers ALTER COLUMN is_active SET NOT NULL;
            """))

            # 4. Create index on is_active
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_workers_is_active ON workers (is_active);
            """))

    print("Worker is_active migration completed successfully!")

if __name__ == "__main__":
    migrate()
