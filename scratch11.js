import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: deletes } = await supabase.from('notification_deletes').select('*');
  console.log('Total deleted:', deletes?.length);
  
  const { data: notifs } = await supabase.from('notifications').select('id, title, created_ms').ilike('title', '%Kirim%');
  console.log('Total Kirim notifications:', notifs?.length);
  
  if (deletes && notifs) {
     const deletedNotifIds = deletes.map(d => d.notification_id);
     const reappeared = notifs.filter(n => deletedNotifIds.includes(n.id));
     console.log('Reappeared (in DB but also in deletes):', reappeared.length);
  }
}
run();
