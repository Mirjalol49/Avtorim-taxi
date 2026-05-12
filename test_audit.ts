import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAudit() {
    const { data, error } = await supabase.from('audit_logs').insert({
        action: 'TEST',
        fleet_id: '123'
    }).select('id').single();
    console.log('Audit test:', { error });
}
testAudit();
