import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: notifs } = await supabase.from('notifications').select('id, fleet_id').limit(1);
  if (!notifs || notifs.length === 0) return console.log('no notif');
  
  const notif = notifs[0];
  console.log('Testing delete for:', notif.id);
  
  const { error: delErr } = await supabase.from('notifications').delete().eq('id', notif.id);
  console.log('Delete error:', delErr);
  
  const { error: insErr } = await supabase.from('notification_deletes').insert({
        notification_id: notif.id,
        user_id: notif.fleet_id || '243c82ac-1cdd-4e59-b617-69fd1e641848',
        deleted_at: Date.now()
  });
  console.log('Insert error:', insErr);
}
run();
