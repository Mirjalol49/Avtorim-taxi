import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
    console.log('Testing admin_profile upsert...');
    const { data, error } = await supabase.from('admin_profile').upsert({ id: 'profile', name: 'Test', updated_ms: Date.now() });
    console.log('Upsert admin_profile result:', { data, error });
}
testUpdate();
