import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('drivers').select('name, is_deleted, plan_history').in('name', ['Doston', 'Murod', 'Davron']);
  console.dir(data, {depth: null});
}
check();
