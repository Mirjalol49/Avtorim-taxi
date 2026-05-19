import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, day_overrides').in('name', ['Murod']);
  
  console.dir(drivers, {depth: null});
}
check();
