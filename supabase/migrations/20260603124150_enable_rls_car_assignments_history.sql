-- Enable RLS for the exposed car assignment history table.
--
-- The app currently uses custom auth rather than Supabase Auth, so auth.uid()
-- is not available for tenant checks. These policies match the existing
-- fleet-scoped table strategy in 20260512000001_fix_admin_users_rls.sql:
-- frontend queries must still filter by fleet_id, while RLS is enabled so
-- Supabase/PostgREST no longer exposes a public table with RLS disabled.

ALTER TABLE public.car_assignments_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_assignments_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_assignments_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_assignments_history TO service_role;

DROP POLICY IF EXISTS "car_assignments_history_select" ON public.car_assignments_history;
DROP POLICY IF EXISTS "car_assignments_history_insert" ON public.car_assignments_history;
DROP POLICY IF EXISTS "car_assignments_history_update" ON public.car_assignments_history;
DROP POLICY IF EXISTS "car_assignments_history_delete" ON public.car_assignments_history;

CREATE POLICY "car_assignments_history_select"
    ON public.car_assignments_history
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "car_assignments_history_insert"
    ON public.car_assignments_history
    FOR INSERT TO anon
    WITH CHECK (fleet_id IS NOT NULL);

CREATE POLICY "car_assignments_history_update"
    ON public.car_assignments_history
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "car_assignments_history_delete"
    ON public.car_assignments_history
    FOR DELETE TO anon
    USING (true);
