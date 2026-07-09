import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testKeys() {
    const { data, error } = await supabase.rpc('get_primary_keys', { table_name: 'admin_profile' });
    console.log('PK check:', { data, error });
}
testKeys();
