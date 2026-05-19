import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, is_deleted, start_date, quit_date, created_ms, daily_plan, plan_history').in('name', ['Habibulloh']);
  
  console.dir(drivers, {depth: null});
}
check();
