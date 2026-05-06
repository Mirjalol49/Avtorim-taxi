-- Composite index optimising the tenant-scoped, time-ordered transaction query:
--   WHERE fleet_id = $1 AND status != 'DELETED' ORDER BY timestamp_ms DESC
--
-- CONCURRENTLY means Postgres builds it without locking the table for writes.
-- Safe to run on production during live traffic.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_fleet_ts
    ON transactions (fleet_id, timestamp_ms DESC)
    WHERE status != 'DELETED';
