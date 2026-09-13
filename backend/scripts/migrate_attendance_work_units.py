import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

def migrate():
    print("Running database migration for numeric work_units...")
    with engine.connect() as conn:
        with conn.begin():
            # 1. Add work_units column if not exists
            conn.execute(text("""
                ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_units NUMERIC(3, 1) DEFAULT 1.0;
            """))

            # 2. Check if status column exists
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'attendance' AND column_name = 'status';
            """))
            has_status = result.fetchone() is not None

            if has_status:
                print("Migrating existing status enum records to work_units numeric...")
                conn.execute(text("""
                    UPDATE attendance SET work_units = CASE 
                        WHEN status::text = 'PRESENT' THEN 1.0 
                        WHEN status::text = 'HALF_DAY' THEN 0.5 
                        ELSE 0.0 
                    END;
                """))
                print("Dropping old status column...")
                conn.execute(text("""
                    ALTER TABLE attendance DROP COLUMN status;
                """))
                conn.execute(text("""
                    DROP TYPE IF EXISTS attendancestatus;
                """))

            # 3. Ensure work_units is NOT NULL
            conn.execute(text("""
                ALTER TABLE attendance ALTER COLUMN work_units SET NOT NULL;
            """))

    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
