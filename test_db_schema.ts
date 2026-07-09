import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: admins, error: err1 } = await supabase.from('admin_users').select('*').limit(1);
    console.log('admins:', admins, err1);

    const { data: profile, error: err2 } = await supabase.from('admin_profile').select('*').limit(1);
    console.log('profile:', profile, err2);
}
check();
