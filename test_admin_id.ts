import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAudit() {
    const { data, error } = await supabase.from('admin_users').select('id').limit(2);
    console.log('Admin Users:', { data, error });
}
testAudit();
