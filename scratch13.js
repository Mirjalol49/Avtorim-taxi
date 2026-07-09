import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// We must use ANON KEY to test RLS!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: notifications } = await supabase.from('notifications').select('id').limit(1);
  if (!notifications || notifications.length === 0) {
      console.log('No notifications to test');
      return;
  }
  const id = notifications[0].id;
  
  const { error: delError } = await supabase.from('notifications').delete().eq('id', id);
  console.log('Delete error (anon):', delError);
  
  const { error: insError } = await supabase.from('notification_deletes').insert({
        notification_id: id,
        user_id: 'global',
        deleted_at: Date.now()
  });
  console.log('Insert delete error (anon):', insError);
}
run();
