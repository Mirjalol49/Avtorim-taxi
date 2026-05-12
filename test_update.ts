import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
    console.log('Testing admin_users update...');
    const { data, error } = await supabase.from('admin_users').update({ username: 'Test' }).eq('role', 'super_admin');
    console.log('Update admin_users result:', { data, error });

    console.log('Testing admin_profile update...');
    const { data: pData, error: pError } = await supabase.from('admin_profile').update({ name: 'Test' }).eq('id', 'profile');
    console.log('Update admin_profile result:', { data: pData, error: pError });
}
testUpdate();
