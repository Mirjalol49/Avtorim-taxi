import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('drivers').select('name, is_deleted, daily_plan, plan_history').eq('is_deleted', true);
  console.log("DELETED DRIVERS DETAILS:");
  console.dir(data, {depth: null});
}
check();
