import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('drivers').select('id, name, day_overrides').limit(5);
  console.log(JSON.stringify(data, null, 2));
  console.error(error);
}
check();
