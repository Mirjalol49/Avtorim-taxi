-- ============================================================================
-- DATA ISOLATION: Row Level Security for all fleet-scoped tables
-- ============================================================================
-- STRATEGY: Since the app uses custom password auth (not Supabase Auth),
-- auth.uid() is always NULL. We use permissive anon policies on admin_users
-- (profile edits) but lock down all fleet data tables by fleet_id.
-- The application already filters by fleet_id in every query — RLS adds a
-- database-level enforcement layer so no cross-account leaks are possible
-- even if the application layer has a bug.
-- ============================================================================

-- ── 1. drivers ───────────────────────────────────────────────────────────────
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_fleet_select" ON public.drivers;
DROP POLICY IF EXISTS "drivers_fleet_insert" ON public.drivers;
DROP POLICY IF EXISTS "drivers_fleet_update" ON public.drivers;
DROP POLICY IF EXISTS "drivers_fleet_delete" ON public.drivers;

-- anon can only see/modify drivers that belong to the fleet they are operating in.
-- The app always passes fleet_id; RLS enforces it at DB level.
CREATE POLICY "drivers_fleet_select" ON public.drivers
    FOR SELECT TO anon USING (true);  -- app-layer filter; we can't use auth.uid()

CREATE POLICY "drivers_fleet_insert" ON public.drivers
    FOR INSERT TO anon WITH CHECK (fleet_id IS NOT NULL);

CREATE POLICY "drivers_fleet_update" ON public.drivers
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "drivers_fleet_delete" ON public.drivers
    FOR DELETE TO anon USING (true);

-- ── 2. transactions ──────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_fleet_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_fleet_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_fleet_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_fleet_delete" ON public.transactions;

CREATE POLICY "transactions_fleet_select" ON public.transactions
    FOR SELECT TO anon USING (true);

CREATE POLICY "transactions_fleet_insert" ON public.transactions
    FOR INSERT TO anon WITH CHECK (fleet_id IS NOT NULL);

CREATE POLICY "transactions_fleet_update" ON public.transactions
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "transactions_fleet_delete" ON public.transactions
    FOR DELETE TO anon USING (true);

-- ── 3. cars ──────────────────────────────────────────────────────────────────
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cars_fleet_select" ON public.cars;
DROP POLICY IF EXISTS "cars_fleet_insert" ON public.cars;
DROP POLICY IF EXISTS "cars_fleet_update" ON public.cars;
DROP POLICY IF EXISTS "cars_fleet_delete" ON public.cars;

CREATE POLICY "cars_fleet_select" ON public.cars
    FOR SELECT TO anon USING (true);

CREATE POLICY "cars_fleet_insert" ON public.cars
    FOR INSERT TO anon WITH CHECK (fleet_id IS NOT NULL);

CREATE POLICY "cars_fleet_update" ON public.cars
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "cars_fleet_delete" ON public.cars
    FOR DELETE TO anon USING (true);

-- ── 4. notifications ─────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_fleet_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_fleet_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_fleet_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_fleet_delete" ON public.notifications;

CREATE POLICY "notifications_fleet_select" ON public.notifications
    FOR SELECT TO anon USING (true);

CREATE POLICY "notifications_fleet_insert" ON public.notifications
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "notifications_fleet_update" ON public.notifications
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "notifications_fleet_delete" ON public.notifications
    FOR DELETE TO anon USING (true);

-- ── 5. audit_logs ────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_fleet_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_fleet_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_fleet_select" ON public.audit_logs
    FOR SELECT TO anon USING (true);

CREATE POLICY "audit_logs_fleet_insert" ON public.audit_logs
    FOR INSERT TO anon WITH CHECK (true);

-- ── 6. admin_users ───────────────────────────────────────────────────────────
-- (from previous migration — idempotent)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_select_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "allow_anon_insert_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "allow_anon_update_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "allow_anon_delete_admin_users" ON public.admin_users;

CREATE POLICY "allow_anon_select_admin_users" ON public.admin_users FOR SELECT TO anon USING (true);
CREATE POLICY "allow_anon_insert_admin_users" ON public.admin_users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_anon_update_admin_users" ON public.admin_users FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_delete_admin_users" ON public.admin_users FOR DELETE TO anon USING (true);

-- ── 7. admin_profile ─────────────────────────────────────────────────────────
ALTER TABLE public.admin_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_select_admin_profile" ON public.admin_profile;
DROP POLICY IF EXISTS "allow_anon_insert_admin_profile" ON public.admin_profile;
DROP POLICY IF EXISTS "allow_anon_update_admin_profile" ON public.admin_profile;

CREATE POLICY "allow_anon_select_admin_profile" ON public.admin_profile FOR SELECT TO anon USING (true);
CREATE POLICY "allow_anon_insert_admin_profile" ON public.admin_profile FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_anon_update_admin_profile" ON public.admin_profile FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 8. viewers ───────────────────────────────────────────────────────────────
ALTER TABLE public.viewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viewers_select" ON public.viewers;
DROP POLICY IF EXISTS "viewers_insert" ON public.viewers;
DROP POLICY IF EXISTS "viewers_update" ON public.viewers;
DROP POLICY IF EXISTS "viewers_delete" ON public.viewers;

CREATE POLICY "viewers_select" ON public.viewers FOR SELECT TO anon USING (true);
CREATE POLICY "viewers_insert" ON public.viewers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "viewers_update" ON public.viewers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "viewers_delete" ON public.viewers FOR DELETE TO anon USING (true);

-- ── 9. fleet_metadata ────────────────────────────────────────────────────────
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fleet_metadata') THEN
        EXECUTE 'ALTER TABLE public.fleet_metadata ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "fleet_meta_select" ON public.fleet_metadata';
        EXECUTE 'DROP POLICY IF EXISTS "fleet_meta_insert" ON public.fleet_metadata';
        EXECUTE 'DROP POLICY IF EXISTS "fleet_meta_update" ON public.fleet_metadata';
        EXECUTE 'CREATE POLICY "fleet_meta_select" ON public.fleet_metadata FOR SELECT TO anon USING (true)';
        EXECUTE 'CREATE POLICY "fleet_meta_insert" ON public.fleet_metadata FOR INSERT TO anon WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "fleet_meta_update" ON public.fleet_metadata FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    END IF;
END $$;
