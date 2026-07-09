import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: notifs } = await supabase.from('notifications').select('id').limit(1);
  if (!notifs || notifs.length === 0) return console.log('no notif');
  
  const ids = [notifs[0].id];
  console.log('Testing delete.in for:', ids);
  
  const { error: delErr } = await supabase.from('notifications').delete().in('id', ids);
  console.log('Delete in error:', delErr);
}
run();
