import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

def migrate():
    print("Running database migration for worker_wage_history...")
    with engine.connect() as conn:
        with conn.begin():
            # 1. Create table if not exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS worker_wage_history (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES admin_settings(id) ON DELETE CASCADE,
                    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
                    daily_wage NUMERIC(10, 2) NOT NULL,
                    effective_from DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
                    updated_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
                    CONSTRAINT uq_worker_wage_effective_from UNIQUE (worker_id, effective_from)
                );
            """))

            # 2. Indexes
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_worker_wage_history_account_id ON worker_wage_history(account_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_worker_wage_history_worker_id ON worker_wage_history(worker_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_worker_wage_history_effective_from ON worker_wage_history(effective_from);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_worker_wage_lookup ON worker_wage_history(account_id, worker_id, effective_from);"))

            # 3. Safe Backfill from existing workers
            result = conn.execute(text("""
                INSERT INTO worker_wage_history (account_id, worker_id, daily_wage, effective_from, created_at, updated_at)
                SELECT
                    w.account_id,
                    w.id AS worker_id,
                    w.daily_wage,
                    COALESCE(
                        (SELECT MIN(a.date) FROM attendance a WHERE a.worker_id = w.id),
                        w.created_at::DATE,
                        CURRENT_DATE
                    ) AS effective_from,
                    COALESCE(w.created_at, NOW() AT TIME ZONE 'UTC') AS created_at,
                    COALESCE(w.updated_at, NOW() AT TIME ZONE 'UTC') AS updated_at
                FROM workers w
                ON CONFLICT (worker_id, effective_from) DO NOTHING;
            """))
            print(f"Backfill applied successfully (rows processed: {result.rowcount}).")

    print("Worker wage history migration completed successfully!")

if __name__ == "__main__":
    migrate()
